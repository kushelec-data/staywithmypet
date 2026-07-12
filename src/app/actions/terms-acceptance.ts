"use server";

import {
  CURRENT_TERMS_VERSION,
  hasAcceptedTermsVersion,
  hasBookingTermsForRequest,
  recordTermsAcceptance,
  attachBookingIdToRequestAcceptance,
  findBookingIdForRequest,
  type RecordTermsAcceptanceInput,
  type TermsAcceptanceContext,
} from "@/lib/terms-acceptance";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return user.id;
}

async function requestMeta(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const userAgent = h.get("user-agent");
  return { ipAddress: ipAddress ?? null, userAgent: userAgent ?? null };
}

export async function getTermsAcceptanceStatusAction(): Promise<{
  hasCurrentVersion: boolean;
  currentVersion: string;
}> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const hasCurrentVersion = await hasAcceptedTermsVersion(supabase, userId);
  return { hasCurrentVersion, currentVersion: CURRENT_TERMS_VERSION };
}

export async function recordTermsAcceptanceAction(
  input: RecordTermsAcceptanceInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const meta = await requestMeta();
  return recordTermsAcceptance(supabase, userId, { ...input, ...meta });
}

export async function hasBookingTermsForRequestAction(
  requestId: string,
  context: TermsAcceptanceContext,
): Promise<boolean> {
  const userId = await requireUserId();
  const supabase = await createClient();
  return hasBookingTermsForRequest(supabase, userId, requestId, context);
}

export async function recordBookingTermsAndAttachAction(
  requestId: string,
  context: TermsAcceptanceContext,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const meta = await requestMeta();
  const recorded = await recordTermsAcceptance(supabase, userId, {
    context,
    requestId,
    ...meta,
  });
  if (!recorded.ok) return recorded;

  const bookingId = await findBookingIdForRequest(supabase, requestId);
  if (bookingId) {
    await attachBookingIdToRequestAcceptance(supabase, userId, requestId, bookingId, context);
  }
  return { ok: true };
}
