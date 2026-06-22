import { formatCareTypeLabel } from "@/lib/care-type-options";
import { formatBookingDatesForRow } from "@/lib/date-format";
import type { EmailLocale } from "@/lib/email-templates/locale";
import { safeOther, safePet, safePetType } from "@/lib/emails/context";
import { absoluteUrl, buildTemplate, escapeHtml, safeName } from "@/lib/emails/layout";
import type { EmailTemplate, EmailTemplateContext } from "@/lib/emails/types";

function formatDates(ctx: EmailTemplateContext, locale: EmailLocale): string {
  const label = formatBookingDatesForRow(
    {
      requestedDates: ctx.requestedDates,
      date_from: ctx.dateFrom,
      date_to: ctx.dateTo,
    },
    { locale, includeYear: true },
  );
  if (label === "Dates to be confirmed") {
    return locale === "et" ? "kuupäevad täpsustamisel" : "dates to be confirmed";
  }
  return label;
}

function formatCareType(ctx: EmailTemplateContext): string | null {
  return formatCareTypeLabel(ctx.careType ?? null);
}

function messageParagraph(ctx: EmailTemplateContext, locale: EmailLocale): string | null {
  const trimmed = ctx.message?.trim();
  if (!trimmed) return null;
  const label = locale === "et" ? "Sõnum" : "Message";
  return `${label}: ${escapeHtml(trimmed)}`;
}

function detailsBlock(ctx: EmailTemplateContext, locale: EmailLocale): string[] {
  const dates = formatDates(ctx, locale);
  const careType = formatCareType(ctx);
  const lines: string[] = [];
  if (locale === "et") {
    lines.push(`📅 Kuupäevad: ${escapeHtml(dates)}`);
    if (careType) lines.push(`🐾 Hoiutüüp: ${escapeHtml(careType)}`);
  } else {
    lines.push(`📅 Dates: ${escapeHtml(dates)}`);
    if (careType) lines.push(`🐾 Care type: ${escapeHtml(careType)}`);
  }
  const message = messageParagraph(ctx, locale);
  if (message) lines.push(message);
  return lines;
}

/** Sender confirmation — you cancelled your request. */
export function requestCancelledByYouTemplate(
  ctx: EmailTemplateContext,
  locale: EmailLocale = ctx.locale ?? "en",
): EmailTemplate {
  const name = safeName(ctx.recipientName);
  const pet = safePet(ctx.petName);
  const petType = safePetType(ctx.petType);
  const receiver = safeOther(ctx.receiverName ?? ctx.otherPartyName);
  const role = ctx.recipientRole;
  const subject =
    locale === "et" ? "Sinu päring tühistati" : "Your request was cancelled";
  const details = detailsBlock(ctx, locale);

  if (role === "pet_friend") {
    return buildTemplate(
      subject,
      locale === "et"
        ? [
            `Tere, ${name},`,
            `Oled tühistanud oma broneeringutaotluse loomaomanikule ${receiver} lemmikule ${petType} <strong>${pet}</strong>.`,
            ...details,
            "Oleme loomaomanikku sellest teavitanud ning taotlus on nüüd suletud.",
            "Kui soovid tutvuda teiste lemmikutega, saad igal ajal uusi profiile sirvida.",
          ]
        : [
            `Hi ${name},`,
            `You have cancelled your booking request to Pet Parent ${receiver} for the ${petType} <strong>${pet}</strong>.`,
            ...details,
            "We've notified them, and the request is now closed.",
            "If you'd like to meet another pet, you can browse other listings at any time.",
          ],
      {
        cta: {
          label: locale === "et" ? "Vaata teisi lemmikuid" : "Browse other pets",
          href: absoluteUrl("/find-pets"),
        },
      },
    );
  }

  return buildTemplate(
    subject,
    locale === "et"
      ? [
          `Tere, ${name},`,
          `Oled tühistanud oma broneeringutaotluse loomasõbrale ${receiver} lemmikule ${petType} <strong>${pet}</strong>.`,
          ...details,
          "Oleme loomasõbra sellest teavitanud ning taotlus on nüüd suletud.",
          "Kui soovid leida teise loomasõbra, saad igal ajal uusi profiile sirvida.",
        ]
      : [
          `Hi ${name},`,
          `You have cancelled your booking request to Pet Friend ${receiver} for your ${petType} <strong>${pet}</strong>.`,
          ...details,
          "We've notified them, and the request is now closed.",
          "If you'd like to find another Pet Friend, you can browse other listings at any time.",
        ],
    {
      cta: {
        label: locale === "et" ? "Vaata teisi loomasõpru" : "Browse more matches",
        href: absoluteUrl("/find-care"),
      },
    },
  );
}

/** Notify the receiver that a care request was cancelled. */
export function requestCancelledNotifyTemplate(
  ctx: EmailTemplateContext,
  locale: EmailLocale = ctx.locale ?? "en",
): EmailTemplate {
  const name = safeName(ctx.recipientName);
  const pet = safePet(ctx.petName);
  const petType = safePetType(ctx.petType);
  const sender = safeOther(ctx.senderName ?? ctx.otherPartyName);
  const role = ctx.recipientRole;
  const subject = locale === "et" ? "Hoiupäring tühistati" : "A care request was cancelled";
  const details = detailsBlock(ctx, locale);

  if (role === "pet_friend") {
    return buildTemplate(
      subject,
      locale === "et"
        ? [
            `Tere, ${name},`,
            `Loomaomanik ${sender} tühistas oma broneeringutaotluse lemmikule ${petType} <strong>${pet}</strong>.`,
            ...details,
            "Taotlus on nüüd suletud. Kui soovid tutvuda teiste lemmikutega, saad igal ajal uusi profiile sirvida.",
          ]
        : [
            `Hi ${name},`,
            `Pet Parent ${sender} has cancelled their booking request for the ${petType} named <strong>${pet}</strong>.`,
            ...details,
            "The request is now closed. If you'd like to meet another pet, you can browse other listings at any time.",
          ],
      {
        cta: {
          label: locale === "et" ? "Vaata teisi lemmikuid" : "Browse other pets",
          href: absoluteUrl("/find-pets"),
        },
      },
    );
  }

  return buildTemplate(
    subject,
    locale === "et"
      ? [
          `Tere, ${name},`,
          `Loomasõber ${sender} tühistas oma broneeringutaotluse sinu ${petType} <strong>${pet}</strong> jaoks.`,
          ...details,
          "Taotlus on nüüd suletud. Kui soovid leida teise loomasõbra, saad igal ajal uusi profiile sirvida.",
        ]
      : [
          `Hi ${name},`,
          `Pet Friend ${sender} has cancelled their booking request for your ${petType} <strong>${pet}</strong>.`,
          ...details,
          "The request is now closed. If you'd like to find another Pet Friend, you can browse other listings at any time.",
        ],
    {
      cta: {
        label: locale === "et" ? "Vaata teisi loomasõpru" : "Browse more matches",
        href: absoluteUrl("/find-care"),
      },
    },
  );
}
