import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import { emailCtx } from "@/lib/emails/context";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

export function bookingConfirmedTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name, pet, petType, other, dates, role } = emailCtx(ctx);
  const bookingHref = ctx.bookingId
    ? absoluteUrl(`/dashboard/bookings/${ctx.bookingId}`)
    : absoluteUrl("/dashboard/bookings");

  if (role === "pet_friend") {
    return buildTemplate(
      `Your booking with ${pet} is confirmed!`,
      [
        `Hi ${name},`,
        `Wonderful news — your booking to care for the ${petType} named <strong>${pet}</strong> has been confirmed by Pet Parent ${other}! The booking will take place from ${dates}.`,
        "You can now contact the Pet Parent directly to coordinate meeting times, routines, and all care details.",
        "Thank you for being part of a caring community that connects hearts — through pets, trust, and kindness.",
      ],
      {
        cta: { label: "View booking details", href: bookingHref },
        checklist: {
          title: "Quick checklist before the stay",
          items: [
            "Review the pet's profile thoroughly — feeding, temperament, and special needs.",
            "Prepare your home or environment for a safe, comfortable stay.",
            "Make sure you have time and attention to fully care for the pet.",
            "Save emergency contacts and discuss any potential concerns with the Pet Parent.",
          ],
        },
      },
    );
  }

  return buildTemplate(
    `Your booking with ${other} is confirmed!`,
    [
      `Hi ${name},`,
      `Great news — your booking with Pet Friend ${other} for your ${petType} <strong>${pet}</strong> has been confirmed! The booking will take place from ${dates}.`,
      `You can now contact ${other} directly to arrange drop-off details and share all care instructions.`,
      "Thank you for trusting another pet lover to care for your furry friend — you're helping build a kinder world for pets and people.",
    ],
    {
      cta: { label: "View booking details", href: bookingHref },
      checklist: {
        title: "Quick checklist before the stay",
        items: [
          "Ensure your pet's profile includes feeding, medical, and behavioural details.",
          "Prepare all essentials — food, leash, bed, toys, medication, and comfort items.",
          "Share any specific routines or special needs to make your pet feel at ease.",
          "Confirm handover times and emergency contact information.",
        ],
      },
    },
  );
}
