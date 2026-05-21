import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import { emailCtx } from "@/lib/emails/context";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

export function reviewReminderFriendTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name, pet, petType } = emailCtx(ctx);
  const reviewPath = ctx.bookingId
    ? `/dashboard/bookings/${ctx.bookingId}`
    : "/dashboard/bookings?tab=completed";

  return buildTemplate(
    `Tell us about your time with ${pet}`,
    [
      `Hi ${name},`,
      `Your booking with ${petType} <strong>${pet}</strong> has come to an end — thank you for the care, time, and love you shared. We hope it was a positive and rewarding experience for both of you.`,
      "Your feedback helps keep Stay With My Pet fair, transparent, and safe for everyone.",
      "Thank you for being a thoughtful part of our community — your voice helps shape better matches for pets and people alike.",
    ],
    {
      cta: { label: "Leave a review", href: absoluteUrl(reviewPath) },
      checklist: {
        title: "When writing your review, you may want to mention",
        items: [
          "Your overall experience as a Pet Friend",
          "How communication and handover with the Pet Parent went",
          "Whether the pet's profile and care instructions were accurate",
          "Anything future Pet Friends might find helpful to know",
        ],
      },
    },
  );
}
