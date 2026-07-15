import {
  ctaButton,
  escapeHtml,
  paragraph,
  wrapEmail,
} from "@/lib/emails/layout";
import { absoluteUrl } from "@/lib/emails/layout";
import type { EmailLocale } from "@/lib/email-templates/locale";
import type { EmailTemplate } from "@/lib/emails/types";

export const MESSAGE_EMAIL_COOLDOWN_MS = 15 * 60 * 1000;
export const RECENTLY_ACTIVE_MS = 10 * 60 * 1000;

export function messageEmailCooldownWindow(nowMs = Date.now()): number {
  return Math.floor(nowMs / MESSAGE_EMAIL_COOLDOWN_MS);
}

export function messageEmailDedupeKey(
  conversationId: string,
  recipientUserId: string,
  nowMs = Date.now(),
): string {
  const windowId = messageEmailCooldownWindow(nowMs);
  return `new_message_${conversationId}_${recipientUserId}_${windowId}`;
}

export function truncateMessagePreview(body: string, maxLen = 120): string {
  const trimmed = body.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

export function buildNewMessageNotificationEmail(
  input: {
    recipientName: string;
    senderName: string;
    conversationId: string;
    messagePreview?: string | null;
    petName?: string | null;
    bookingDateRange?: string | null;
    bookingStatus?: string | null;
  },
  locale: EmailLocale,
): EmailTemplate {
  const conversationUrl = absoluteUrl(
    `/messages?conversation=${encodeURIComponent(input.conversationId)}`,
  );
  const name = input.recipientName.trim() || (locale === "et" ? "Kasutaja" : "Member");
  const sender = input.senderName.trim() || (locale === "et" ? "Kasutaja" : "Member");
  const preview = input.messagePreview?.trim() || null;

  const subject =
    locale === "et"
      ? `${sender} saatis sulle StayWithMyPetis sõnumi`
      : `${sender} sent you a message on StayWithMyPet`;

  const ctaLabel = locale === "et" ? "Ava vestlus" : "Open conversation";

  const contextLines: string[] = [];
  if (input.petName?.trim()) {
    contextLines.push(
      locale === "et"
        ? `Lemmikloom: ${input.petName.trim()}`
        : `Pet: ${input.petName.trim()}`,
    );
  }
  if (input.bookingDateRange?.trim()) {
    contextLines.push(
      locale === "et"
        ? `Broneering: ${input.bookingDateRange.trim()}`
        : `Booking: ${input.bookingDateRange.trim()}`,
    );
  }
  if (input.bookingStatus?.trim()) {
    contextLines.push(
      locale === "et"
        ? `Staatus: ${input.bookingStatus.trim()}`
        : `Status: ${input.bookingStatus.trim()}`,
    );
  }

  const intro =
    locale === "et"
      ? `Sulle saabus uus sõnum kasutajalt ${sender}.`
      : `You have a new message from ${sender}.`;

  const previewBlock = preview
    ? locale === "et"
      ? `Eelvaade: “${preview}”`
      : `Preview: “${preview}”`
    : null;

  const footer =
    locale === "et"
      ? "Küsimuste korral kirjuta meile: info@staywithmypet.ee"
      : "Questions? Contact us at info@staywithmypet.ee";

  const textParts = [
    locale === "et" ? `Tere, ${name}` : `Hi ${name}`,
    "",
    intro,
    ...contextLines,
    previewBlock ?? "",
    "",
    `${ctaLabel}: ${conversationUrl}`,
    "",
    footer,
  ].filter((line, index, arr) => !(line === "" && arr[index - 1] === ""));

  const htmlParts = [
    paragraph(locale === "et" ? `Tere, ${escapeHtml(name)}` : `Hi ${escapeHtml(name)}`),
    paragraph(escapeHtml(intro)),
  ];

  for (const line of contextLines) {
    htmlParts.push(paragraph(escapeHtml(line)));
  }
  if (previewBlock) {
    htmlParts.push(paragraph(escapeHtml(previewBlock)));
  }
  htmlParts.push(ctaButton(ctaLabel, conversationUrl));
  htmlParts.push(paragraph(escapeHtml(footer)));

  const headline = locale === "et" ? "Uus sõnum" : "New message";

  return {
    subject,
    html: wrapEmail(htmlParts.join(""), headline),
    text: textParts.join("\n"),
  };
}

export type MessageEmailSkipReason =
  | "recipient_recently_active"
  | "cooldown_duplicate"
  | "no_email"
  | "no_admin"
  | "no_api_key"
  | "send_failed"
  | "validation_failed";

export function logMessageEmailEvent(
  stage: string,
  detail: Record<string, unknown>,
): void {
  console.info("[message-email]", { stage, ...detail });
}

export function maskUserId(userId: string | null | undefined): string | null {
  if (!userId?.trim()) return null;
  return userId.length <= 8 ? userId : `${userId.slice(0, 8)}…`;
}
