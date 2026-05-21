import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import { emailCtx } from "@/lib/emails/context";
import { formatDate } from "@/lib/date-format";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

/** Sent ~7 days before membership ends (DOCX). */
export function membershipExpiryReminderTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name } = emailCtx(ctx);
  const end = ctx.membershipEndDate
    ? formatDate(ctx.membershipEndDate, "en", { includeYear: true })
    : "soon";
  const renewal = ctx.renewalDate
    ? formatDate(ctx.renewalDate, "en", { includeYear: true })
    : end;
  const packageName = ctx.packageName?.trim() || "your plan";

  return buildTemplate(
    "Your Stay With My Pet membership is ending soon",
    [
      `Hi ${name},`,
      "Just a friendly reminder that your Stay With My Pet membership is ending soon.",
      `<strong>Important dates</strong><br />Package ends on: ${end}<br />Automatic renewal date: ${renewal}<br />Package: ${packageName}`,
      "Your membership renews automatically; no action is needed — we'll take care of it for you. If you'd like to make changes, you can do so anytime from your account dashboard.",
      "We're glad to have you with us.",
    ],
    { cta: { label: "Manage membership", href: absoluteUrl("/membership") } },
  );
}
