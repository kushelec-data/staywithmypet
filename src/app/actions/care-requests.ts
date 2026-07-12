"use server";

import { deliverCareRequestNotifications } from "@/lib/request-delivery";
import { createCareRequest, respondToRequest, type CreateCareRequestInput } from "@/lib/requests";
import { createClient } from "@/lib/supabase/server";
import {
  attachBookingIdToRequestAcceptance,
  bookingTermsContextForRole,
  findBookingIdForRequest,
  hasAcceptedTermsVersion,
  hasBookingTermsForRequest,
  recordTermsAcceptance,
  type TermsAcceptanceContext,
} from "@/lib/terms-acceptance";
import type { MembershipRole } from "@/lib/membership";
import { headers } from "next/headers";

export type SubmitCareRequestInput = Omit<CreateCareRequestInput, "senderId"> & {
  termsAccepted?: boolean;
  senderRole?: MembershipRole;
};

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function requestMeta(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const userAgent = h.get("user-agent");
  return { ipAddress: ipAddress ?? null, userAgent: userAgent ?? null };
}

async function ensureTermsRecorded(
  userId: string,
  context: TermsAcceptanceContext,
  requestId: string,
): Promise<void> {
  const supabase = await createClient();
  const already = await hasBookingTermsForRequest(supabase, userId, requestId, context);
  if (already) return;

  const meta = await requestMeta();
  const recorded = await recordTermsAcceptance(supabase, userId, {
    context,
    requestId,
    ...meta,
  });
  if (!recorded.ok) {
    throw new Error("Could not record Terms of Use acceptance.");
  }
}

/**
 * Creates a care request server-side and delivers owner/requester email notifications.
 * Email failures are logged but never block a successful insert.
 */
export async function submitCareRequestAction(
  input: SubmitCareRequestInput,
): Promise<{ requestId: string }> {
  const userId = await requireUserId();
  if (!userId) {
    throw new Error("Not signed in.");
  }

  if (!input.termsAccepted || !input.senderRole) {
    throw new Error("Terms of Use acceptance is required before sending a booking request.");
  }

  const supabase = await createClient();
  const hasCurrentTerms = await hasAcceptedTermsVersion(supabase, userId);
  if (!hasCurrentTerms && !input.termsAccepted) {
    throw new Error("Please accept the latest Terms of Use before continuing.");
  }

  const { requestId } = await createCareRequest(supabase, {
    ...input,
    senderId: userId,
  });

  await ensureTermsRecorded(
    userId,
    bookingTermsContextForRole(input.senderRole),
    requestId,
  );

  console.info("[request-email] request created", {
    requestId,
    senderId: userId,
    receiverId: input.receiverId,
    petId: input.petId,
    petParentId: input.petParentId,
    petFriendId: input.petFriendId,
  });

  try {
    await deliverCareRequestNotifications(requestId, userId);
  } catch (err) {
    console.error("[request-email] error", {
      requestId,
      stage: "deliverCareRequestNotifications",
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return { requestId };
}

export async function acceptCareRequestAction(input: {
  requestId: string;
  receiverRole: MembershipRole;
  termsAccepted?: boolean;
}): Promise<{ conversationId: string | null }> {
  const userId = await requireUserId();
  if (!userId) {
    throw new Error("Not signed in.");
  }

  if (!input.termsAccepted) {
    throw new Error("Terms of Use acceptance is required before accepting a booking.");
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
      throw new Error("Could not record Terms of Use acceptance.");
    }
  }

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

  return { conversationId };
}
