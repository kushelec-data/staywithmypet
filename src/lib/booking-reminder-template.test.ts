import { describe, expect, it } from "vitest";
import {
  buildBookingStartsTomorrowFriendEmail,
  buildBookingStartsTomorrowParentEmail,
} from "@/lib/email-templates/booking-emails";

const ctx = {
  recipientName: "Gerly",
  recipientRole: "pet_parent" as const,
  petName: "Denny",
  petType: "dog",
  dateFrom: "2026-10-25",
  dateTo: "2026-10-27",
  otherPartyName: "Andreas",
  bookingId: "booking-future",
  conversationId: "conv-59a99d56",
  locale: "en" as const,
};

describe("booking starts tomorrow templates", () => {
  it("includes dates, the other participant, booking link, and conversation link", () => {
    const parent = buildBookingStartsTomorrowParentEmail(ctx, "en");
    expect(parent.subject.toLowerCase()).toContain("tomorrow");
    expect(parent.html).toContain("October 25, 2026");
    expect(parent.html).toContain("October 27, 2026");
    expect(parent.html).toContain("Andreas");
    expect(parent.html).toContain("/dashboard/bookings/booking-future");
    expect(parent.html).toContain("/messages?conversation=conv-59a99d56");
    expect(parent.html).not.toMatch(/\b\d{1,2}:\d{2}\b/);
  });

  it("addresses the pet friend template to the pet parent name", () => {
    const friend = buildBookingStartsTomorrowFriendEmail(
      { ...ctx, recipientRole: "pet_friend", recipientName: "Andreas", otherPartyName: "Gerly" },
      "en",
    );
    expect(friend.html).toContain("Gerly");
    expect(friend.html).toContain("/dashboard/bookings/booking-future");
    expect(friend.html).toContain("/messages?conversation=conv-59a99d56");
  });
});
