import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  bookingAllowsPrivateContact,
  buildPrivateContactFromProfileRow,
  buildPrivateContactFromRpcContact,
  buildPublicParticipantFromProfileRow,
  emptyPrivateContactInfo,
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
    details: { emergency_contact_relationship: "Partner" },
  };

  it("maps public participant without private fields", () => {
    const publicInfo = buildPublicParticipantFromProfileRow(profileRow, "pet_friend");
    expect(publicInfo.displayName).toBe("Andreas H");
    expect(publicInfo.profileHref).toBe("/users/friend-1");
    expect(publicInfo.role).toBe("pet_friend");
  });

  it("maps private contact with phone, email, address, emergency relationship, and maps link", () => {
    const contact = buildPrivateContactFromProfileRow(profileRow, "gerly@example.com");
    expect(contact.phoneE164).toBe("+37255555555");
    expect(contact.phoneDisplay).toBe("+372 5555 5555");
    expect(contact.email).toBe("gerly@example.com");
    expect(contact.address).toBe("Tallinn, Estonia");
    expect(contact.mapsUrl).toContain("59.437");
    expect(contact.emergencyContact?.name).toBe("Emergency Person");
    expect(contact.emergencyContact?.relationship).toBe("Partner");
  });

  it("maps RPC contact payload", () => {
    const contact = buildPrivateContactFromRpcContact({
      phone_e164: "+37259017916",
      phone_display: "+37259017916",
      email: "user@example.com",
      address: "Tallinn, Estonia",
      emergency_name: "Jane Doe",
      emergency_phone_e164: "+37255556666",
      emergency_phone_display: "+37255556666",
      emergency_relationship: "Sister",
    });

    expect(contact.phoneDisplay).toBe("+372 5901 7916");
    expect(contact.email).toBe("user@example.com");
    expect(contact.emergencyContact?.relationship).toBe("Sister");
  });

  it("maps empty RPC contact to nullable fields for Not provided UI", () => {
    const contact = buildPrivateContactFromRpcContact({
      phone_e164: null,
      phone_display: null,
      email: null,
      address: null,
      emergency_name: null,
      emergency_phone_e164: null,
      emergency_phone_display: null,
      emergency_relationship: null,
    });

    expect(contact.phoneDisplay).toBeNull();
    expect(contact.email).toBeNull();
    expect(contact.address).toBeNull();
    expect(contact.emergencyContact).toBeNull();
  });

  it("exposes empty private contact helper", () => {
    const contact = emptyPrivateContactInfo();
    expect(contact.phoneDisplay).toBeNull();
    expect(contact.email).toBeNull();
    expect(contact.address).toBeNull();
  });
});

describe("contact links", () => {
  it("uses tel and mailto href patterns", () => {
    const phone = "+37259017916";
    const email = "gerly@example.com";

    expect(`tel:${phone}`).toBe("tel:+37259017916");
    expect(`mailto:${email}`).toBe("mailto:gerly@example.com");
  });
});
