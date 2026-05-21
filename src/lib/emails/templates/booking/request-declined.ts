import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import { emailCtx } from "@/lib/emails/context";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

/** Decliner confirmation (you declined). */
export function requestDeclinedByYouTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name, pet, petType, other, role } = emailCtx(ctx);

  if (role === "pet_friend") {
    return buildTemplate(
      `You've declined a booking request for ${pet}`,
      [
        `Hi ${name},`,
        `You've declined the booking request from Pet Parent ${other} for the ${petType} <strong>${pet}</strong>. We've notified them, and the request is now closed.`,
        "If your availability changes or you'd like to meet another pet, you can browse other listings at any time.",
        "Thank you for being part of a community that values responsible and loving pet-sharing.",
      ],
      {
        cta: { label: "Browse other pets", href: absoluteUrl("/find-pets") },
        checklist: {
          title: "Quick checklist",
          items: [
            "Keep your availability and preferences updated.",
            "Check new requests regularly — you might find the perfect match soon.",
            "Maintain your profile with honest details about your lifestyle and environment.",
          ],
        },
      },
    );
  }

  return buildTemplate(
    `You've declined a booking request for ${pet}`,
    [
      `Hi ${name},`,
      `You've declined the booking request from Pet Friend ${other} for your ${petType} <strong>${pet}</strong>. We've notified them, and the request has been closed.`,
      "If your availability changes or you'd like to find another Pet Friend, you can update your pet's profile at any time.",
      "Thank you for being a thoughtful member of our community and for showing such deep care for your pet.",
    ],
    {
      cta: { label: "Manage your pet's profile", href: absoluteUrl("/pets") },
      checklist: {
        title: "Quick checklist",
        items: [
          "Keep your pet's availability updated to receive better matches.",
          "Check incoming requests regularly to avoid missed opportunities.",
          "Ensure your pet's profile stays current with accurate care info.",
        ],
      },
    },
  );
}

/** Notify the request sender that their request was declined. */
export function requestDeclinedNotifyTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name, pet, petType, other, role } = emailCtx(ctx);

  if (role === "pet_friend") {
    return buildTemplate(
      `Your booking request for ${pet} was declined`,
      [
        `Hi ${name},`,
        `Unfortunately, your booking request for the ${petType} named <strong>${pet}</strong> was declined by Pet Parent ${other}.`,
        "Sometimes schedules or preferences just don't align — but don't worry! There are many other wonderful pets waiting to meet you.",
        "Thank you for staying part of our caring community — every match brings us closer to more love and less loneliness.",
      ],
      {
        cta: { label: "Browse more matches", href: absoluteUrl("/find-pets") },
        checklist: {
          title: "Quick checklist for next time",
          items: [
            "Keep your profile up to date with clear and friendly details.",
            "Try adjusting your availability or preferred duration of care.",
            "Explore new matches that might better fit your timing or needs.",
          ],
        },
      },
    );
  }

  return buildTemplate(
    `Your booking request for ${pet} was declined`,
    [
      `Hi ${name},`,
      `Unfortunately, your booking request for your ${petType} <strong>${pet}</strong> was declined by Pet Friend ${other}.`,
      "Sometimes schedules or preferences just don't align — but don't worry! Many other wonderful Pet Friends are waiting to meet your pet.",
      "Thank you for staying part of our caring community — every match brings us closer to more love and less loneliness.",
    ],
    {
      cta: { label: "Browse more matches", href: absoluteUrl("/find-care") },
      checklist: {
        title: "Quick checklist for next time",
        items: [
          "Keep your pet's profile up to date with clear details.",
          "Try adjusting the availability or preferred duration of care.",
          "Explore new matches that might better fit your timing or needs.",
        ],
      },
    },
  );
}
