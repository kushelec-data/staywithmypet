import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import { emailCtx } from "@/lib/emails/context";
import { formatDate } from "@/lib/date-format";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

export function membershipActivatedTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name } = emailCtx(ctx);
  const packageName = ctx.packageName?.trim() || "Your plan";
  const start = ctx.dateFrom ? formatDate(ctx.dateFrom, "en", { includeYear: true }) : "—";
  const end = ctx.membershipEndDate
    ? formatDate(ctx.membershipEndDate, "en", { includeYear: true })
    : "—";
  const autoRenew = ctx.autoRenew ? "Yes" : "No";

  return buildTemplate(
    "Your Stay With My Pet membership is active",
    [
      `Hi ${name},`,
      "Thank you for choosing Stay With My Pet — we're happy to let you know that your membership has been successfully activated.",
      `<strong>Your membership details</strong><br />Package: ${packageName}<br />Start date: ${start}<br />End date: ${end}<br />Automatic renewal: ${autoRenew}`,
      "You can now enjoy full access to all features included in your package — from sending and receiving booking requests to messaging and leaving feedback.",
      "You can manage your membership or update your settings anytime from your account dashboard.",
      "If you have any questions, we're always here to help. Thank you for being part of our community.",
    ],
    { cta: { label: "Manage membership", href: absoluteUrl("/membership") } },
  );
}
