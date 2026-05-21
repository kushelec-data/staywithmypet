import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import { emailCtx } from "@/lib/emails/context";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

export function requestSentTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name, pet, petType, other, dates, role } = emailCtx(ctx);

  if (role === "pet_friend") {
    return buildTemplate(
      `Your booking request for ${pet} has been sent!`,
      [
        `Hi ${name},`,
        `Your booking request to spend time with ${petType} named <strong>${pet}</strong> has been sent to Pet Parent ${other}. They'll review your profile and confirm whether the arrangement works for them.`,
        "You'll get a notification once they respond.",
        "Thank you for spreading care and companionship — for pets and people alike.",
      ],
      {
        cta: { label: "View your request", href: absoluteUrl("/requests?direction=outgoing") },
        checklist: {
          title: "Quick checklist before confirmation",
          items: [
            "Make sure your profile includes experience, environment, and availability details.",
            "Be ready to answer questions about your care routine and expectations.",
            "Stay patient — some Pet Parents may need time to review profiles carefully.",
          ],
        },
      },
    );
  }

  return buildTemplate(
    `Your booking request for ${pet} has been sent!`,
    [
      `Hi ${name},`,
      `Your booking request for your ${petType} <strong>${pet}</strong> has been successfully sent to Pet Friend ${other}. The request covers the period ${dates}.`,
      "They'll review your request and confirm if the timing and conditions work for them. You'll receive an update as soon as they respond.",
      "Thank you for helping us make pet care flexible, responsible, and full of love.",
    ],
    {
      cta: { label: "View your request", href: absoluteUrl("/requests?direction=outgoing") },
      checklist: {
        title: "Quick checklist before confirmation",
        items: [
          "Double-check your pet's profile — feeding, behaviour, and medical notes are up to date.",
          "Ensure the requested dates are accurate.",
          "Be ready to answer any questions the Pet Friend may have about your pet's routine or needs.",
        ],
      },
    },
  );
}
