import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";
import { emailCtx } from "@/lib/emails/context";

export function welcomePetParentTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name } = emailCtx(ctx);
  return buildTemplate(
    "Welcome to Stay With My Pet",
    [
      `Hi ${name},`,
      "You're set up as a Pet Parent. Add your pet's profile with routines, needs, and personality — then find trusted Pet Friends nearby when you're ready.",
      "Thank you for helping us make pet care flexible, responsible, and full of love.",
    ],
    { cta: { label: "Add your pet", href: absoluteUrl("/pets/new") } },
  );
}
