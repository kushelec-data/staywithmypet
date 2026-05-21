import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import { emailCtx } from "@/lib/emails/context";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

export function requestReceivedTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name, pet, petType, other, dates, role } = emailCtx(ctx);

  if (role === "pet_parent") {
    return buildTemplate(
      `You've received a booking request for ${pet}!`,
      [
        `Hi ${name},`,
        `You've just received a booking request from Pet Friend ${other} to spend time with your ${petType} <strong>${pet}</strong> between ${dates}.`,
        "Please review their profile and decide whether this match feels right for you and your pet. Once you confirm, the booking will become active.",
        "Thank you for opening your heart and helping pets experience more love, less loneliness.",
      ],
      {
        cta: { label: "View request", href: absoluteUrl("/requests?direction=incoming") },
        checklist: {
          title: "Quick checklist before you decide",
          items: [
            "Review the Pet Friend's profile carefully — check their experience and availability.",
            "Make sure your pet's profile is up to date with all important details.",
            "Contact them if you want to discuss routines, preferences, or expectations before approving.",
          ],
        },
      },
    );
  }

  return buildTemplate(
    `You've received a booking request to care for ${pet}!`,
    [
      `Hi ${name},`,
      `You've received a booking request from Pet Parent ${other}, who would like you to care for ${petType} named <strong>${pet}</strong> from ${dates}.`,
      "Please review the pet's profile and decide whether the arrangement suits your schedule and environment. Once you confirm, the booking will become active.",
      "Thank you for helping pets feel loved and cared for — and for bringing more joy to their lives (and yours).",
    ],
    {
      cta: { label: "View request", href: absoluteUrl("/requests?direction=incoming") },
      checklist: {
        title: "Quick checklist before you decide",
        items: [
          "Read the pet's profile carefully — make sure the temperament and needs fit your situation.",
          "Check your availability and daily routine for the requested period.",
          "If you have questions, message the Pet Parent before confirming.",
        ],
      },
    },
  );
}
