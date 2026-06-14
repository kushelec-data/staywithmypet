import { buildEmailFromExcelColumnE } from "@/lib/email-templates/render-excel-e";
import type { EmailLocale } from "@/lib/email-templates/locale";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

/** Excel Column E rows 5–6 — Profile verified */
export function buildProfileVerifiedEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "profile_verified_subject",
    "profile_verified_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 8–9 — Membership activated */
export function buildMembershipActivatedEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "membership_activated_subject",
    "membership_activated_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 51–52 — Membership renews soon */
export function buildMembershipRenewalReminderEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "membership_renewal_subject",
    "membership_renewal_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 54–55 — Membership ending soon */
export function buildMembershipExpiryReminderEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return buildEmailFromExcelColumnE(
    "membership_expiry_subject",
    "membership_expiry_body",
    ctx,
    locale,
  );
}

/** Excel Column E rows 63–64 — New message */
export function buildNewMessageEmail(
  ctx: EmailTemplateContext,
  locale: EmailLocale,
): EmailTemplate {
  return buildEmailFromExcelColumnE("new_message_subject", "new_message_body", ctx, locale);
}
