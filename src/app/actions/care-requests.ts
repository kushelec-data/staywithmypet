"use server";

import { deliverCareRequestNotifications } from "@/lib/request-delivery";
import { createCareRequest, respondToRequest, type CreateCareRequestInput } from "@/lib/requests";
import {
  type CareRequestCreateErrorCode,
  type CreateCareRequestResult,
} from "@/lib/request-create-errors";
import { createClient } from "@/lib/supabase/server";
import {
  attachBookingIdToRequestAcceptance,
  attachRequestIdToTermsAcceptance,
  bookingTermsContextForRole,
  classifyTermsInsertError,
  CURRENT_TERMS_VERSION,
  findBookingIdForRequest,
  friendlyTermsInsertMessage,
  hasBookingTermsForRequest,
  recordTermsAcceptance,
} from "@/lib/terms-acceptance";
import {
  hasActiveMembershipForRole,
  type MembershipRole,
  type UserMembershipsByRole,
} from "@/lib/membership";
import { loadMembershipsForUser } from "@/lib/membership-access";
import { headers } from "next/headers";

export type SubmitCareRequestInput = Omit<CreateCareRequestInput, "senderId" | "requestId"> & {
  termsAccepted?: boolean;
  senderRole?: MembershipRole;
};

export type CareRequestActionErrorCode =
  | "NOT_SIGNED_IN"
  | CareRequestCreateErrorCode
  | "TERMS_REQUIRED"
  | "TERMS_STORAGE_ERROR"
  | "TERMS_SCHEMA_MISSING"
  | "TERMS_AUTH_ERROR"
  | "VALIDATION_ERROR";

function termsErrorCode(kind: ReturnType<typeof classifyTermsInsertError>): CareRequestActionErrorCode {
  if (kind === "schema_missing") return "TERMS_SCHEMA_MISSING";
  if (kind === "rls_auth") return "TERMS_AUTH_ERROR";
  return "TERMS_STORAGE_ERROR";
}

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

function mapTermsInsertFailure(
  termsRecorded: Extract<Awaited<ReturnType<typeof recordTermsAcceptance>>, { ok: false }>,
): { code: CareRequestActionErrorCode; message: string } {
  const code = termsErrorCode(termsRecorded.kind);
  return {
    code,
    message: friendlyTermsInsertMessage(termsRecorded.kind),
  };
}

function mapCreateFailure(
  created: Extract<CreateCareRequestResult, { ok: false }>,
): { code: CareRequestActionErrorCode; message: string } {
  return {
    code: created.code,
    message: created.message,
  };
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
    petParentId: input.petParentId,
    petFriendId: input.petFriendId,
    receiverId: input.receiverId,
    senderRole: input.senderRole ?? null,
    careType: input.careType,
    selectedDates: input.selectedDates,
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
    termsVersion: CURRENT_TERMS_VERSION,
    ...meta,
  });

  console.info("[care-request:submit] terms acceptance", {
    userId,
    requestId,
    termsVersion: CURRENT_TERMS_VERSION,
    acceptanceContext: termsContext,
    membershipRole: input.senderRole,
    planId: membershipResult.planId ?? null,
    bookingId: null,
    ok: termsRecorded.ok,
    ...(termsRecorded.ok
      ? { acceptanceId: termsRecorded.id }
      : {
          code: termsRecorded.code,
          message: termsRecorded.error,
          details: termsRecorded.details,
          hint: termsRecorded.hint,
          kind: termsRecorded.kind,
        }),
  });

  if (!termsRecorded.ok) {
    return { success: false, ...mapTermsInsertFailure(termsRecorded) };
  }

  const created = await createCareRequest(supabase, {
    ...input,
    senderId: userId,
    requestId,
  });

  console.info("[care-request:submit] request insert", {
    userId,
    plannedRequestId: requestId,
    petId: input.petId,
    petParentId: input.petParentId,
    petFriendId: input.petFriendId,
    receiverId: input.receiverId,
    ok: created.ok,
    ...(created.ok
      ? { requestId: created.requestId }
      : {
          code: created.supabaseCode ?? created.code,
          message: created.error,
          details: created.details,
          hint: created.hint,
          userCode: created.code,
        }),
  });

  if (!created.ok) {
    return { success: false, ...mapCreateFailure(created) };
  }

  const linked = await attachRequestIdToTermsAcceptance(
    supabase,
    userId,
    termsRecorded.id,
    requestId,
  );
  if (!linked.ok) {
    console.error("[care-request:submit] terms request_id link failed", {
      userId,
      acceptanceId: termsRecorded.id,
      requestId,
      code: linked.code,
      message: linked.error,
    });
  } else {
    console.info("[care-request:submit] terms linked to request", {
      userId,
      acceptanceId: termsRecorded.id,
      requestId,
    });
  }

  try {
    await deliverCareRequestNotifications(created.requestId, userId);
    console.info("[care-request:submit] notifications delivered", {
      userId,
      requestId: created.requestId,
    });
  } catch (err) {
    console.error("[care-request:submit] notification delivery failed", {
      userId,
      requestId: created.requestId,
      stage: "deliverCareRequestNotifications",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  console.info("[care-request:submit] success", {
    userId,
    requestId: created.requestId,
    petId: input.petId,
    receiverId: input.receiverId,
  });

  return { success: true, requestId: created.requestId };
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
      return {
        success: false,
        ...mapTermsInsertFailure(recorded),
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
