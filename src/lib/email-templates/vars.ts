import { formatDate } from "@/lib/date-format";
import { emailCtx, emailDateRange } from "@/lib/emails/context";
import { absoluteUrl } from "@/lib/emails/layout";
import type { EmailLocale } from "@/lib/email-templates/locale";
import type { EmailTemplateContext } from "@/lib/emails/types";

export type EmailTemplateVars = {
  name: string;
  petName: string;
  petType: string;
  petParentName: string;
  petFriendName: string;
  otherPartyName: string;
  dateRange: string;
  packageName: string;
  startDate: string;
  endDate: string;
  autoRenew: string;
  viewRequestUrl: string;
  viewIncomingRequestUrl: string;
  viewBookingUrl: string;
  reviewLink: string;
  messageLink: string;
  messageLinkWithConversation: string;
  managePetProfileUrl: string;
  browsePetsUrl: string;
  browseMatchesUrl: string;
  membershipUrl: string;
};

function formatEmailDate(value: string | null | undefined, locale: EmailLocale): string {
  if (!value?.trim()) return "—";
  return formatDate(value, locale, { includeYear: true });
}

export function buildEmailTemplateVars(ctx: EmailTemplateContext): EmailTemplateVars {
  const locale: EmailLocale = ctx.locale ?? "en";
  const { name, pet, petType, other, dates, role } = emailCtx(ctx);
  const petParentName = role === "pet_parent" ? name : other;
  const petFriendName = role === "pet_friend" ? name : other;

  const bookingPath = ctx.bookingId
    ? `/dashboard/bookings/${ctx.bookingId}`
    : "/dashboard/bookings";

  const reviewPath = ctx.bookingId
    ? `/dashboard/bookings/${ctx.bookingId}`
    : "/dashboard/bookings?tab=completed";

  const messagePath = ctx.conversationId
    ? `/messages?conversation=${encodeURIComponent(ctx.conversationId)}`
    : "/messages";

  const packageName = ctx.packageName?.trim() || "Your plan";
  const startDate = formatEmailDate(ctx.dateFrom, locale);
  const endDate = formatEmailDate(ctx.membershipEndDate ?? ctx.dateTo, locale);

  return {
    name,
    petName: pet,
    petType,
    petParentName,
    petFriendName,
    otherPartyName: other,
    dateRange: dates,
    packageName,
    startDate,
    endDate,
    autoRenew: ctx.autoRenew ? (locale === "et" ? "Jah" : "Yes") : locale === "et" ? "Ei" : "No",
    viewRequestUrl: absoluteUrl("/requests?direction=outgoing"),
    viewIncomingRequestUrl: absoluteUrl("/requests?direction=incoming"),
    viewBookingUrl: absoluteUrl(bookingPath),
    reviewLink: absoluteUrl(reviewPath),
    messageLink: absoluteUrl("/messages"),
    messageLinkWithConversation: absoluteUrl(messagePath),
    managePetProfileUrl: absoluteUrl("/pets"),
    browsePetsUrl: absoluteUrl("/find-pets"),
    browseMatchesUrl: absoluteUrl(role === "pet_friend" ? "/find-pets" : "/find-care"),
    membershipUrl: absoluteUrl("/membership"),
  };
}

export function bookingDateRange(ctx: EmailTemplateContext): string {
  return emailDateRange(ctx);
}
