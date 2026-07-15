import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildNewMessageNotificationEmail,
  messageEmailCooldownWindow,
  messageEmailDedupeKey,
  MESSAGE_EMAIL_COOLDOWN_MS,
  truncateMessagePreview,
} from "@/lib/message-notification-email";

describe("message email dedupe", () => {
  it("uses conversation, recipient, and 15-minute window in unique key", () => {
    const now = 1_700_000_000_000;
    const key = messageEmailDedupeKey("conv-1", "user-2", now);
    const windowId = messageEmailCooldownWindow(now);
    expect(key).toBe(`new_message_conv-1_user-2_${windowId}`);
  });

  it("changes dedupe window after cooldown expires", () => {
    const t0 = 0;
    const t1 = MESSAGE_EMAIL_COOLDOWN_MS;
    expect(messageEmailCooldownWindow(t0)).not.toBe(messageEmailCooldownWindow(t1));
  });
});

describe("truncateMessagePreview", () => {
  it("truncates long message bodies safely", () => {
    const long = "a".repeat(200);
    const preview = truncateMessagePreview(long, 120);
    expect(preview.length).toBeLessThanOrEqual(120);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("keeps short messages intact", () => {
    expect(truncateMessagePreview("Hello there")).toBe("Hello there");
  });
});

describe("buildNewMessageNotificationEmail", () => {
  it("uses required EN subject and conversation link", () => {
    const template = buildNewMessageNotificationEmail(
      {
        recipientName: "Gerly",
        senderName: "Andreas H",
        conversationId: "conv-123",
        messagePreview: "See you tomorrow",
        petName: "Denny",
        bookingDateRange: "Jul 1 – Jul 5, 2026",
        bookingStatus: "active",
      },
      "en",
    );

    expect(template.subject).toBe("Andreas H sent you a message on StayWithMyPet");
    expect(template.text).toContain("Open conversation");
    expect(template.text).toContain("/messages?conversation=conv-123");
    expect(template.text).toContain("Pet: Denny");
    expect(template.text).toContain("Preview:");
    expect(template.text).not.toContain("See you tomorrow".repeat(2));
  });

  it("uses required ET subject", () => {
    const template = buildNewMessageNotificationEmail(
      {
        recipientName: "Gerly",
        senderName: "Andreas H",
        conversationId: "conv-123",
        messagePreview: "Homme",
      },
      "et",
    );

    expect(template.subject).toBe("Andreas H saatis sulle StayWithMyPetis sõnumi");
    expect(template.text).toContain("Ava vestlus");
  });
});
