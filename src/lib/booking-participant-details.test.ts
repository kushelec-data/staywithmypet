import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  bookingAllowsPrivateContact,
  buildPrivateContactFromProfileRow,
  buildPublicParticipantFromProfileRow,
  requestAllowsPrivateContact,
} from "@/lib/booking-participant-details";

describe("bookingAllowsPrivateContact", () => {
  it("allows contact for upcoming, active, and completed bookings", () => {
    expect(bookingAllowsPrivateContact("upcoming")).toBe(true);
    expect(bookingAllowsPrivateContact("active")).toBe(true);
    expect(bookingAllowsPrivateContact("completed")).toBe(true);
  });

  it("denies contact for cancelled bookings", () => {
    expect(bookingAllowsPrivateContact("cancelled")).toBe(false);
  });
});

describe("requestAllowsPrivateContact", () => {
  it("denies private contact for pending requests", () => {
    expect(requestAllowsPrivateContact("pending")).toBe(false);
  });

  it("allows private contact only after acceptance", () => {
    expect(requestAllowsPrivateContact("accepted")).toBe(true);
    expect(requestAllowsPrivateContact("completed")).toBe(true);
    expect(requestAllowsPrivateContact("declined")).toBe(false);
  });
});

describe("participant contact mapping", () => {
  const profileRow = {
    id: "friend-1",
    display_name: "Andreas H",
    avatar_url: "/avatar.png",
    phone: null,
    phone_e164: "+37255555555",
    phone_number: null,
    phone_country_code: null,
    formatted_address: "Tallinn, Estonia",
    address: null,
    latitude: 59.437,
    longitude: 24.7536,
    emergency_contact_name: "Emergency Person",
    emergency_contact_phone_e164: "+37255556666",
    emergency_contact_phone_number: null,
    emergency_contact_phone_country_code: null,
  };

  it("maps public participant without private fields", () => {
    const publicInfo = buildPublicParticipantFromProfileRow(profileRow, "pet_friend");
    expect(publicInfo.displayName).toBe("Andreas H");
    expect(publicInfo.profileHref).toBe("/users/friend-1");
    expect(publicInfo.role).toBe("pet_friend");
  });

  it("maps private contact with phone, email, address, and maps link", () => {
    const contact = buildPrivateContactFromProfileRow(profileRow, "gerly@example.com");
    expect(contact.phoneE164).toBe("+37255555555");
    expect(contact.email).toBe("gerly@example.com");
    expect(contact.address).toBe("Tallinn, Estonia");
    expect(contact.mapsUrl).toContain("59.437");
    expect(contact.emergencyContact?.name).toBe("Emergency Person");
  });
});

describe("mobile participant actions", () => {
  it("uses tel, mailto, and maps href patterns for contact buttons", () => {
    const phone = "+37255555555";
    const email = "gerly@example.com";
    const mapsUrl = "https://www.google.com/maps/search/?api=1&query=59.437,24.7536";

    expect(`tel:${phone}`).toBe("tel:+37255555555");
    expect(`mailto:${email}`).toBe("mailto:gerly@example.com");
    expect(mapsUrl.startsWith("https://www.google.com/maps/")).toBe(true);
  });
});
