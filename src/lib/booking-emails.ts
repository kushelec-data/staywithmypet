/**
 * @deprecated Use `@/lib/email-triggers` and `@/lib/email-send` instead.
 * Kept for imports that expected booking completion email helpers.
 */

export { triggerBookingCompletedEmails as sendBookingCompletionEmails } from "@/lib/email-triggers";

export function isBookingEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}
