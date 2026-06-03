import { formatBookingDates, formatDateRange } from "@/lib/date-format";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
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
  const requested = normalizeAvailabilityDates(ctx.requestedDates ?? []);
  if (requested.length) {
    return (
      formatBookingDates(requested, { locale: "en", includeYear: true }) ??
      "dates to be confirmed"
    );
  }

  const from = ctx.dateFrom ?? null;
  const to = ctx.dateTo ?? null;
  if (!from && !to) return "dates to be confirmed";
  if (from && to) return formatDateRange(from, to, "en", { includeYear: true });
  if (from) return formatDateRange(from, from, "en", { includeYear: true });
  if (to) return formatDateRange(to, to, "en", { includeYear: true });
  return "dates to be confirmed";
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
