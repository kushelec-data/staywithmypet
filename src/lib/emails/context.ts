import { formatBookingDatesForRow } from "@/lib/date-format";
import { escapeHtml, safeName } from "@/lib/emails/layout";
import type { EmailTemplateContext } from "@/lib/emails/types";

export function safePet(name: string | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? escapeHtml(trimmed) : "your pet";
}

export function safePetType(type: string | undefined): string {
  const trimmed = type?.trim();
  return trimmed ? escapeHtml(trimmed) : "pet";
}

export function safeOther(name: string | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? escapeHtml(trimmed) : "a member";
}

export function emailDateRange(ctx: EmailTemplateContext): string {
  const label = formatBookingDatesForRow(
    {
      requestedDates: ctx.requestedDates,
      date_from: ctx.dateFrom,
      date_to: ctx.dateTo,
    },
    { locale: "en", includeYear: true },
  );
  return label === "Dates to be confirmed" ? "dates to be confirmed" : label;
}

export function emailCtx(ctx: EmailTemplateContext) {
  return {
    name: safeName(ctx.recipientName),
    pet: safePet(ctx.petName),
    petType: safePetType(ctx.petType),
    other: safeOther(ctx.otherPartyName),
    dates: emailDateRange(ctx),
    role: ctx.recipientRole,
  };
}
