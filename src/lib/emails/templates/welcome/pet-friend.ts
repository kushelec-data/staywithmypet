import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";
import { emailCtx } from "@/lib/emails/context";

export function welcomePetFriendTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name } = emailCtx(ctx);
  return buildTemplate(
    "Welcome to Stay With My Pet",
    [
      `Hi ${name},`,
      "You're set up as a Pet Friend. Complete your profile with experience, environment, and availability — then browse pets looking for care in your area.",
      "Thank you for spreading care and companionship — for pets and people alike.",
    ],
    { cta: { label: "Find pets", href: absoluteUrl("/find-pets") } },
  );
}
