import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canCreateConversationForRequestStatus,
  canSendInConversation,
  conversationSummaryIncludesId,
  isInboxVisibleRequestStatus,
  resolveSelectedConversationId,
  type ConversationSummary,
} from "@/lib/messaging";

function makeSummary(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: "conv-accepted",
    requestId: "req-1",
    bookingId: "booking-1",
    petId: "pet-1",
    petName: "Denny",
    threadTitle: "Care for Denny",
    petPhotoUrl: null,
    otherPartyId: "friend-1",
    otherPartyName: "Andreas H",
    otherPartyAvatarUrl: null,
    requestStatus: "accepted",
    bookingStatus: "upcoming",
    bookingStartDate: "2026-12-03",
    bookingEndDate: "2026-12-06",
    bookingRequestedDates: ["2026-12-03", "2026-12-06"],
    bookingCancelledAt: null,
    requestDateFrom: "2026-12-03",
    requestDateTo: "2026-12-06",
    dateLabel: "Dec 3 – Dec 6, 2026",
    dateRangeKey: "2026-12-03|2026-12-06||",
    careType: "Overnight care / 24h stay",
    lastMessagePreview: "Hi",
    lastMessageAt: "2026-11-03T17:25:25.000Z",
    unreadCount: 0,
    sortAt: "2026-11-03T17:25:25.000Z",
    conversationIds: ["conv-accepted"],
    ...overrides,
  };
}

describe("inbox visibility for declined and cancelled request threads", () => {
  it("keeps existing declined and cancelled conversations readable", () => {
    expect(isInboxVisibleRequestStatus("pending")).toBe(true);
    expect(isInboxVisibleRequestStatus("accepted")).toBe(true);
    expect(isInboxVisibleRequestStatus("completed")).toBe(true);
    expect(isInboxVisibleRequestStatus("declined")).toBe(true);
    expect(isInboxVisibleRequestStatus("cancelled")).toBe(true);
  });

  it("does not create new conversations for declined or cancelled requests", () => {
    expect(canCreateConversationForRequestStatus("pending")).toBe(true);
    expect(canCreateConversationForRequestStatus("accepted")).toBe(true);
    expect(canCreateConversationForRequestStatus("completed")).toBe(true);
    expect(canCreateConversationForRequestStatus("declined")).toBe(false);
    expect(canCreateConversationForRequestStatus("cancelled")).toBe(false);
  });

  it("blocks sending on declined threads while leaving accepted threads open", () => {
    expect(canSendInConversation(makeSummary({ requestStatus: "declined" }))).toBe(false);
    expect(canSendInConversation(makeSummary({ requestStatus: "cancelled" }))).toBe(false);
    expect(canSendInConversation(makeSummary({ requestStatus: "accepted" }))).toBe(true);
  });

  it("opens an email deep link to a declined conversation even when another thread is selected", () => {
    const declined = makeSummary({
      id: "5c750547-b0f7-4435-8d6c-2c7374a7b300",
      requestId: "4cfc16a7-c2ac-4efe-b4af-8a1c93636b36",
      requestStatus: "declined",
      bookingId: null,
      bookingStatus: null,
      dateRangeKey: "2026-11-07|2026-11-09||",
      unreadCount: 1,
      conversationIds: ["5c750547-b0f7-4435-8d6c-2c7374a7b300"],
    });
    const december = makeSummary();

    expect(
      resolveSelectedConversationId(
        [december, declined],
        "5c750547-b0f7-4435-8d6c-2c7374a7b300",
        december.id,
      ),
    ).toBe(declined.id);
  });

  it("resolves a merged sibling conversation id from an email link", () => {
    const merged = makeSummary({
      id: "conv-primary",
      conversationIds: ["conv-primary", "conv-email"],
    });
    expect(conversationSummaryIncludesId(merged, "conv-email")).toBe(true);
    expect(resolveSelectedConversationId([merged], "conv-email", null)).toBe("conv-primary");
  });

  it("keeps membership send enforcement on the insert path", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/messaging.ts"), "utf8");
    expect(source).toContain("assertActiveMembership");
    expect(source).toContain('if (requestStatus === "declined")');
    expect(source).toContain("isInboxVisibleRequestStatus");
    expect(source).toContain("canCreateConversationForRequestStatus");
  });
});
