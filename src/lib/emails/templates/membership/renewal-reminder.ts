import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import { emailCtx } from "@/lib/emails/context";
import { formatDate } from "@/lib/date-format";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

/** Sent ~2 days before automatic renewal (DOCX). */
export function membershipRenewalReminderTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name } = emailCtx(ctx);
  const renewal = ctx.renewalDate
    ? formatDate(ctx.renewalDate, "en", { includeYear: true })
    : "your renewal date";

  return buildTemplate(
    "Upcoming renewal for your Stay With My Pet membership",
    [
      `Hi ${name},`,
      "This is a quick heads-up that your Stay With My Pet membership is scheduled to renew automatically on:",
      `<strong>${renewal}</strong>`,
      "No action is needed if you're happy to continue — your access will remain uninterrupted. If you'd like to review or update your membership, you can do so anytime from your account dashboard.",
      "Thank you for being part of Stay With My Pet.",
    ],
    { cta: { label: "Manage membership", href: absoluteUrl("/membership") } },
  );
}
