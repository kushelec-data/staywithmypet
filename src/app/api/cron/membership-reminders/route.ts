import { membershipEmailContext } from "@/lib/membership-emails";
import { sendTransactionalEmail } from "@/lib/email-send";
import type { UserMembership } from "@/lib/membership";
import { isInternalSecretAuthorized } from "@/lib/security/internal-secret-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * Scheduled job: send 7-day expiry and 2-day auto-renewal reminders.
 *
 * Vercel Cron (see vercel.json): daily at 09:00 UTC — POST /api/cron/membership-reminders
 * Auth: Authorization: Bearer CRON_SECRET (Vercel) or x-email-internal-secret / x-cron-secret
 */
export async function POST(request: Request) {
  if (!isInternalSecretAuthorized(request, { allowEmailInternalHeader: true })) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });
  }

  const today = new Date();
  const in7 = new Date(today);
  in7.setUTCDate(in7.getUTCDate() + 7);
  const in2 = new Date(today);
  in2.setUTCDate(in2.getUTCDate() + 2);

  const expiryDay = in7.toISOString().slice(0, 10);
  const renewalDay = in2.toISOString().slice(0, 10);
  const expiryStart = `${expiryDay}T00:00:00.000Z`;
  const expiryEnd = `${expiryDay}T23:59:59.999Z`;
  const renewalStart = `${renewalDay}T00:00:00.000Z`;
  const renewalEnd = `${renewalDay}T23:59:59.999Z`;

  const { data: expiring, error: expiringErr } = await admin
    .from("user_memberships")
    .select(
      "id, user_id, role, plan_id, plan_name, status, start_date, end_date, auto_renew, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_checkout_session_id",
    )
    .eq("status", "active")
    .gte("end_date", expiryStart)
    .lte("end_date", expiryEnd);

  if (expiringErr) {
    return NextResponse.json({ error: expiringErr.message }, { status: 500 });
  }

  const { data: renewing, error: renewingErr } = await admin
    .from("user_memberships")
    .select(
      "id, user_id, role, plan_id, plan_name, status, start_date, end_date, auto_renew, stripe_customer_id, stripe_subscription_id, stripe_price_id, stripe_checkout_session_id",
    )
    .eq("status", "active")
    .eq("auto_renew", true)
    .gte("end_date", renewalStart)
    .lte("end_date", renewalEnd);

  if (renewingErr) {
    return NextResponse.json({ error: renewingErr.message }, { status: 500 });
  }

  let expirySent = 0;
  let renewalSent = 0;

  for (const row of expiring ?? []) {
    const result = await sendTransactionalEmail({
      eventType: "membership_expiry_reminder",
      userId: row.user_id,
      requestId: row.id,
      context: membershipEmailContext(row as UserMembership),
    });
    if (result.sent) expirySent += 1;
  }

  for (const row of renewing ?? []) {
    const result = await sendTransactionalEmail({
      eventType: "membership_renewal_reminder",
      userId: row.user_id,
      requestId: row.id,
      context: membershipEmailContext(row as UserMembership),
    });
    if (result.sent) renewalSent += 1;
  }

  return NextResponse.json({
    ok: true,
    expiry_candidates: expiring?.length ?? 0,
    renewal_candidates: renewing?.length ?? 0,
    expiry_sent: expirySent,
    renewal_sent: renewalSent,
    expiry_target_date: expiryDay,
    renewal_target_date: renewalDay,
  });
}
