import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";
import { emailCtx } from "@/lib/emails/context";

export function phoneVerifiedTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name } = emailCtx(ctx);
  return buildTemplate(
    "Your phone is verified",
    [
      `Hi ${name},`,
      "Your phone number is now verified. This helps Pet Parents and Pet Friends reach you with confidence when care is arranged.",
    ],
    { cta: { label: "View your profile", href: absoluteUrl("/profile/edit") } },
  );
}
