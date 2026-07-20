import { describe, expect, it } from "vitest";
import {
  buildPreferredVetFullAddress,
  preferredVetClinicDbFieldsFromForm,
  preferredVetClinicFromRpc,
  preferredVetMapsUrl,
  preferredVetSectionStarted,
  validatePreferredVetClinicForm,
} from "@/lib/preferred-vet-clinic";
import { emptyPreferredVetClinicFormValues } from "@/components/profile/PreferredVetClinicFormSection";

describe("preferredVetSectionStarted", () => {
  it("is false for empty form", () => {
    expect(preferredVetSectionStarted(emptyPreferredVetClinicFormValues())).toBe(false);
  });

  it("is true when clinic name is entered", () => {
    expect(
      preferredVetSectionStarted({
        ...emptyPreferredVetClinicFormValues(),
        clinicName: "PetCity",
      }),
    ).toBe(true);
  });
});

describe("validatePreferredVetClinicForm", () => {
  it("requires clinic name and phone when section started", () => {
    expect(() =>
      validatePreferredVetClinicForm({
        ...emptyPreferredVetClinicFormValues(),
        clinicName: "PetCity",
      }),
    ).toThrow(/clinic phone/i);
  });

  it("persists valid clinic fields", () => {
    const fields = preferredVetClinicDbFieldsFromForm({
      ...emptyPreferredVetClinicFormValues(),
      clinicName: "PetCity",
      phoneDialCode: "+372",
      phoneNational: "5123456",
      address: "Main 1",
      city: "Tallinn",
      postalCode: "10111",
      email: "clinic@example.com",
    });

    expect(fields.preferred_vet_clinic_name).toBe("PetCity");
    expect(fields.preferred_vet_phone).toBe("+3725123456");
    expect(fields.preferred_vet_email).toBe("clinic@example.com");
  });
});

describe("preferredVetClinicFromRpc", () => {
  it("maps RPC payload", () => {
    const clinic = preferredVetClinicFromRpc({
      clinic_name: "PetCity",
      veterinarian_name: "Dr. Liis",
      phone: "+3725123456",
      emergency_phone: "+37255556666",
      email: "info@petcity.ee",
      address: "Main 1",
      city: "Tallinn",
      postal_code: "10111",
      opening_hours: "Mon–Fri 9–17",
      notes: "Ring the bell",
    });

    expect(clinic?.clinicName).toBe("PetCity");
    expect(clinic?.scope).toBe("pet_parent_default");
    expect(buildPreferredVetFullAddress(clinic!)).toBe("Main 1, Tallinn, 10111");
    expect(preferredVetMapsUrl(clinic!)).toContain(encodeURIComponent("Main 1, Tallinn, 10111"));
  });
});
