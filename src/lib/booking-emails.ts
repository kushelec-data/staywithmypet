/**
 * @deprecated Use `@/lib/email-triggers` and `@/lib/email-send` instead.
 * Kept for imports that expected booking completion email helpers.
 */

import { isTransactionalEmailConfigured } from "@/lib/smtp-config";

export { triggerBookingCompletedEmails as sendBookingCompletionEmails } from "@/lib/email-triggers";

export function isBookingEmailConfigured(): boolean {
  return isTransactionalEmailConfigured();
}
