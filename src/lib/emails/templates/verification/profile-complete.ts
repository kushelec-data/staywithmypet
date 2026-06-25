import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";
import { emailCtx } from "@/lib/emails/context";

export function profileCompletedTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name } = emailCtx(ctx);
  return buildTemplate(
    "Congratulations! Your Profile is Complete 🎉",
    [
      `Hi ${name},`,
      "Congratulations! Your StayWithMyPet profile is now complete. Your profile is ready and visible, making it easier for other members to connect with you.",
    ],
    { cta: { label: "View your profile", href: absoluteUrl("/profile/edit") } },
  );
}
