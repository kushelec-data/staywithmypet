import { describe, expect, it, vi } from "vitest";

const mockCreateAdminClient = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

import { hydrateScheduledEmailContext } from "@/lib/email-scheduled-context";

describe("hydrateScheduledEmailContext", () => {
  it("includes booking dates, the other participant, and the conversation id", async () => {
    mockCreateAdminClient.mockReturnValue({
      from(table: string) {
        const api = {
          select: () => api,
          eq: () => api,
          maybeSingle: async () => {
            if (table === "bookings") {
              return {
                data: {
                  id: "booking-future",
                  request_id: "request-1",
                  pet_id: "pet-1",
                  pet_parent_id: "parent-1",
                  pet_friend_id: "friend-1",
                  start_date: "2026-10-25",
                  end_date: "2026-10-27",
                },
                error: null,
              };
            }
            if (table === "requests") {
              return { data: { care_type: "overnight", pet_parent_id: "parent-1", pet_friend_id: "friend-1", requested_dates: null, date_from: "2026-10-25", date_to: "2026-10-27" }, error: null };
            }
            if (table === "pets") {
              return { data: { name: "Denny", species: "dog", breed: null, other_breed: null }, error: null };
            }
            if (table === "profiles") {
              return { data: { display_name: "Member" }, error: null };
            }
            if (table === "conversations") {
              return { data: { id: "conv-1" }, error: null };
            }
            return { data: null, error: null };
          },
        };
        return api;
      },
    });

    const context = await hydrateScheduledEmailContext({
      unique_key: "booking_starts_tomorrow_parent_booking-future_parent-1",
      user_id: "parent-1",
      event_type: "booking_starts_tomorrow_parent",
      related_request_id: "request-1",
      related_booking_id: "booking-future",
    });

    expect(context?.bookingId).toBe("booking-future");
    expect(context?.dateFrom).toBe("2026-10-25");
    expect(context?.dateTo).toBe("2026-10-27");
    expect(context?.conversationId).toBe("conv-1");
    expect(context?.recipientRole).toBe("pet_parent");
  });
});
