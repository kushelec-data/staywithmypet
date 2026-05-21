import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";
import { emailCtx } from "@/lib/emails/context";

export function profileCompletedTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name } = emailCtx(ctx);
  return buildTemplate(
    "Your profile is 100% complete",
    [
      `Hi ${name},`,
      "Great work — your profile and trust details are fully complete. You're ready to send and receive care requests with confidence.",
      "Thank you for being a thoughtful part of our community.",
    ],
    { cta: { label: "View your profile", href: absoluteUrl("/profile/edit") } },
  );
}
