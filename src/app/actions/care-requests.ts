"use server";

import { deliverCareRequestNotifications } from "@/lib/request-delivery";
import { createCareRequest, respondToRequest, type CreateCareRequestInput } from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";
import {
  attachBookingIdToRequestAcceptance,
  bookingTermsContextForRole,
  findBookingIdForRequest,
  hasBookingTermsForRequest,
  isTermsSchemaMissingError,
  recordTermsAcceptance,
  type TermsAcceptanceContext,
} from "@/lib/terms-acceptance";
import {
  hasActiveMembershipForRole,
  type MembershipRole,
  type UserMembershipsByRole,
} from "@/lib/membership";
import { loadMembershipsForUser, MEMBERSHIP_REQUIRED_MESSAGE } from "@/lib/membership-access";
import { isPostgrestError, logSupabaseError } from "@/lib/supabase-errors";
import { headers } from "next/headers";

export type SubmitCareRequestInput = Omit<CreateCareRequestInput, "senderId" | "requestId"> & {
  termsAccepted?: boolean;
  senderRole?: MembershipRole;
};

export type CareRequestActionErrorCode =
  | "NOT_SIGNED_IN"
  | "MEMBERSHIP_REQUIRED"
  | "TERMS_REQUIRED"
  | "TERMS_STORAGE_ERROR"
  | "TERMS_SCHEMA_MISSING"
  | "REQUEST_CREATE_ERROR"
  | "VALIDATION_ERROR";

export type SubmitCareRequestResult =
  | { success: true; requestId: string }
  | { success: false; code: CareRequestActionErrorCode; message: string };

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function requestMeta(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip");
    const userAgent = h.get("user-agent");
    return { ipAddress: ipAddress ?? null, userAgent: userAgent ?? null };
  } catch (err) {
    console.warn("[care-request:submit] requestMeta unavailable", {
      message: err instanceof Error ? err.message : String(err),
    });
    return { ipAddress: null, userAgent: null };
  }
}

function membershipSnapshot(
  memberships: UserMembershipsByRole,
  role: MembershipRole,
): Record<string, unknown> {
  const row = memberships[role];
  return {
    role,
    hasActive: hasActiveMembershipForRole(memberships, role),
    status: row?.status ?? null,
    planId: row?.plan_id ?? null,
    endDate: row?.end_date ?? null,
  };
}

function membershipRequiredMessage(role: MembershipRole): string {
  return role === "pet_parent"
    ? "An active Pet Parent membership is required to send a care request."
    : "An active Pet Friend membership is required to send a care request.";
}

function termsStorageFriendlyMessage(): string {
  return "We could not save your Terms acceptance. Please try again.";
}

function termsSchemaFriendlyMessage(): string {
  return "Terms acceptance is not configured yet. Please contact support or try again later.";
}

/**
 * Creates a care request server-side and delivers owner/requester email notifications.
 * Email failures are logged but never block a successful insert.
 */
export async function submitCareRequestAction(
  input: SubmitCareRequestInput,
): Promise<SubmitCareRequestResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { success: false, code: "NOT_SIGNED_IN", message: "Not signed in." };
  }

  console.info("[care-request:submit] start", {
    userId,
    petId: input.petId,
    senderRole: input.senderRole ?? null,
    termsAccepted: Boolean(input.termsAccepted),
  });

  if (!input.termsAccepted) {
    console.warn("[care-request:submit] terms not accepted", { userId });
    return {
      success: false,
      code: "TERMS_REQUIRED",
      message: "Terms of Use acceptance is required before sending a booking request.",
    };
  }

  if (!input.senderRole) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      message: "Could not determine your membership role for this request.",
    };
  }

  const supabase = await createClient();
  const memberships = await loadMembershipsForUser(supabase, userId);
  const membershipResult = membershipSnapshot(memberships, input.senderRole);

  console.info("[care-request:submit] membership check", {
    userId,
    petId: input.petId,
    ...membershipResult,
  });

  if (!hasActiveMembershipForRole(memberships, input.senderRole)) {
    return {
      success: false,
      code: "MEMBERSHIP_REQUIRED",
      message: membershipRequiredMessage(input.senderRole),
    };
  }

  const requestId = crypto.randomUUID();
  const termsContext = bookingTermsContextForRole(input.senderRole);
  const meta = await requestMeta();
  const termsRecorded = await recordTermsAcceptance(supabase, userId, {
    context: termsContext,
    membershipRole: input.senderRole,
    requestId,
    ...meta,
  });

  console.info("[care-request:submit] terms acceptance", {
    userId,
    requestId,
    context: termsContext,
    ok: termsRecorded.ok,
    ...(termsRecorded.ok
      ? {}
      : {
          code: termsRecorded.code,
          message: termsRecorded.error,
          details: termsRecorded.details,
          hint: termsRecorded.hint,
        }),
  });

  if (!termsRecorded.ok) {
    if (isTermsSchemaMissingError(termsRecorded)) {
      return {
        success: false,
        code: "TERMS_SCHEMA_MISSING",
        message: termsSchemaFriendlyMessage(),
      };
    }
    return {
      success: false,
      code: "TERMS_STORAGE_ERROR",
      message: termsStorageFriendlyMessage(),
    };
  }

  try {
    const created = await createCareRequest(supabase, {
      ...input,
      senderId: userId,
      requestId,
    });

    console.info("[care-request:submit] request created", {
      userId,
      requestId: created.requestId,
      petId: input.petId,
      receiverId: input.receiverId,
    });

    try {
      await deliverCareRequestNotifications(created.requestId, userId);
    } catch (err) {
      console.error("[request-email] error", {
        requestId: created.requestId,
        stage: "deliverCareRequestNotifications",
        message: err instanceof Error ? err.message : String(err),
      });
    }

    return { success: true, requestId: created.requestId };
  } catch (err) {
    if (err instanceof Error && err.message.includes(MEMBERSHIP_REQUIRED_MESSAGE)) {
      console.warn("[care-request:submit] membership denied in createCareRequest", {
        userId,
        petId: input.petId,
        senderRole: input.senderRole,
      });
      return {
        success: false,
        code: "MEMBERSHIP_REQUIRED",
        message: membershipRequiredMessage(input.senderRole),
      };
    }

    if (isPostgrestError(err)) {
      logSupabaseError("care-request:submit insert", err);
      console.error("[care-request:submit] request insert failed", {
        userId,
        petId: input.petId,
        code: err.code,
        message: err.message,
        details: err.details,
        hint: err.hint,
      });
    } else {
      console.error("[care-request:submit] request create failed", {
        userId,
        petId: input.petId,
        message: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      success: false,
      code: "REQUEST_CREATE_ERROR",
      message: "Could not send request. Please try again.",
    };
  }
}

export async function acceptCareRequestAction(input: {
  requestId: string;
  receiverRole: MembershipRole;
  termsAccepted?: boolean;
}): Promise<
  | { success: true; conversationId: string | null }
  | { success: false; code: CareRequestActionErrorCode; message: string }
> {
  const userId = await requireUserId();
  if (!userId) {
    return { success: false, code: "NOT_SIGNED_IN", message: "Not signed in." };
  }

  if (!input.termsAccepted) {
    return {
      success: false,
      code: "TERMS_REQUIRED",
      message: "Terms of Use acceptance is required before accepting a booking.",
    };
  }

  const supabase = await createClient();
  const context = bookingTermsContextForRole(input.receiverRole);
  const alreadyAccepted = await hasBookingTermsForRequest(
    supabase,
    userId,
    input.requestId,
    context,
  );

  if (!alreadyAccepted) {
    const meta = await requestMeta();
    const recorded = await recordTermsAcceptance(supabase, userId, {
      context,
      requestId: input.requestId,
      membershipRole: input.receiverRole,
      ...meta,
    });
    if (!recorded.ok) {
      if (isTermsSchemaMissingError(recorded)) {
        return {
          success: false,
          code: "TERMS_SCHEMA_MISSING",
          message: termsSchemaFriendlyMessage(),
        };
      }
      return {
        success: false,
        code: "TERMS_STORAGE_ERROR",
        message: termsStorageFriendlyMessage(),
      };
    }
  }

  try {
    const { conversationId } = await respondToRequest(
      supabase,
      userId,
      input.requestId,
      "accepted",
    );

    const bookingId = await findBookingIdForRequest(supabase, input.requestId);
    if (bookingId) {
      await attachBookingIdToRequestAcceptance(
        supabase,
        userId,
        input.requestId,
        bookingId,
        context,
      );
    }

    return { success: true, conversationId };
  } catch (err) {
    console.error("[care-request:accept] failed", {
      userId,
      requestId: input.requestId,
      message: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      code: "REQUEST_CREATE_ERROR",
      message: err instanceof Error ? err.message : "Could not accept this request.",
    };
  }
}
