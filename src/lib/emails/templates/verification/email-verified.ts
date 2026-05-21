import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";
import { emailCtx } from "@/lib/emails/context";

export function emailVerifiedTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name } = emailCtx(ctx);
  return buildTemplate(
    "Your email is verified",
    [
      `Hi ${name},`,
      "Your email address is now verified. You're one step closer to sending and receiving care requests on Stay With My Pet.",
    ],
    { cta: { label: "Go to your dashboard", href: absoluteUrl("/dashboard") } },
  );
}
