import { absoluteUrl, buildTemplate } from "@/lib/emails/layout";
import { emailCtx } from "@/lib/emails/context";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

export function bookingCompletedTemplate(ctx: EmailTemplateContext): EmailTemplate {
  const { name, pet, petType, other, dates, role } = emailCtx(ctx);
  const bookingHref = absoluteUrl("/dashboard/bookings?tab=completed");

  if (role === "pet_friend") {
    return buildTemplate(
      `Your booking with ${pet} is complete`,
      [
        `Hi ${name},`,
        `Your booking with ${petType} <strong>${pet}</strong> (${dates}) arranged with Pet Parent ${other} is now marked complete.`,
        "We'll send you a separate reminder soon to share your experience — your feedback helps the community.",
      ],
      { cta: { label: "View bookings", href: bookingHref } },
    );
  }

  return buildTemplate(
    `Your booking for ${pet} is complete`,
    [
      `Hi ${name},`,
      `Your booking for your ${petType} <strong>${pet}</strong> with Pet Friend ${other} (${dates}) is now marked complete.`,
      "We'll send you a separate reminder soon to share your experience — your review helps other Pet Parents choose with confidence.",
    ],
    { cta: { label: "View bookings", href: bookingHref } },
  );
}
