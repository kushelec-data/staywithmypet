import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import { emailCtx } from "@/lib/emails/context";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

export function reviewReminderParentTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name, pet, petType, other } = emailCtx(ctx);
  const reviewPath = ctx.bookingId
    ? `/dashboard/bookings/${ctx.bookingId}`
    : "/dashboard/bookings?tab=completed";

  return buildTemplate(
    `How did it go with ${other}? Share your experience`,
    [
      `Hi ${name},`,
      `Your booking for your ${petType} <strong>${pet}</strong> with Pet Friend ${other} has now come to an end — we hope everything went smoothly and your pet felt safe, happy, and well cared for.`,
      "Your review helps other Pet Parents make confident choices and supports Pet Friends who offer loving, responsible care.",
      "Thank you for taking a moment to support our community — every honest review helps create more love and less loneliness.",
    ],
    {
      cta: { label: "Leave a review", href: absoluteUrl(reviewPath) },
      checklist: {
        title: "When leaving your feedback, you might consider sharing",
        items: [
          "Your overall experience with the Pet Friend",
          "How communication and coordination felt",
          "How comfortable and relaxed your pet seemed during and after the stay",
          "Anything that stood out — positively or as a learning point",
        ],
      },
    },
  );
}
