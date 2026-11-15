import { describe, expect, it } from "vitest";
import { DAY5_COPY } from "@/lib/profile-completion-reminders/copy";
import { LISTING_INTERNAL_TEST_SUBJECT_PREFIX } from "./config";
import { buildListingProfileCompletionEmail, markListingInternalTestEmail } from "./templates";

describe("listing campaign templates", () => {
  it("reuses the approved Day 5 copy with role-specific listing CTAs", () => {
    const parentEt = buildListingProfileCompletionEmail({
      role: "pet_parent",
      locale: "et",
      firstName: "Gerly",
      petCount: 0,
    });
    expect(parentEt.subject).toBe(DAY5_COPY.pet_parent.et.subject);
    expect(parentEt.html).toContain(DAY5_COPY.pet_parent.et.preheader);
    expect(parentEt.html).toContain("Täida oma profiil lõpuni");
    expect(parentEt.html).toContain("Tere, Gerly!");
    expect(parentEt.html).toContain("https://www.staywithmypet.ee/pets/new");
    expect(parentEt.html).not.toContain('href="https://www.staywithmypet.ee/profile/edit"');

    const parentEnIncompletePet = buildListingProfileCompletionEmail({
      role: "pet_parent",
      locale: "en",
      firstName: "Alex",
      petCount: 2,
    });
    expect(parentEnIncompletePet.subject).toBe(DAY5_COPY.pet_parent.en.subject);
    expect(parentEnIncompletePet.html).toContain("Complete Your Profile");
    expect(parentEnIncompletePet.html).toContain("https://www.staywithmypet.ee/pets");
    expect(parentEnIncompletePet.html).not.toContain("/pets/new");

    const friendEn = buildListingProfileCompletionEmail({
      role: "pet_friend",
      locale: "en",
      firstName: "Sam",
      petCount: 0,
    });
    expect(friendEn.subject).toBe(DAY5_COPY.pet_friend.en.subject);
    expect(friendEn.html).toContain("Why complete your profile?");
    expect(friendEn.html).toContain("https://www.staywithmypet.ee/profile/edit");
  });

  it("marks internal tests with the SWMP prefix and generic names only", () => {
    const customer = buildListingProfileCompletionEmail({
      role: "pet_parent",
      locale: "en",
      firstName: "Kush",
      petCount: 0,
    });
    const internal = markListingInternalTestEmail(customer);
    expect(internal.subject).toBe(`${LISTING_INTERNAL_TEST_SUBJECT_PREFIX} ${DAY5_COPY.pet_parent.en.subject}`);
    expect(internal.html).toContain("INTERNAL TEST ONLY");
    expect(internal.html).not.toContain("Ingrid");
    expect(internal.html).not.toContain("@gmail.com");
  });
});
