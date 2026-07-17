import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { et } from "@/i18n/et";

describe("calendar UX copy", () => {
  it("defines general availability strings in English and Estonian", () => {
    expect(en.publicProfileUi.generalAvailability).toBe("General availability");
    expect(en.publicProfileUi.generalAvailabilityHint).toContain("selected pet");
    expect(et.publicProfileUi.generalAvailability).toBe("Üldine saadavus");
    expect(et.publicProfileUi.generalAvailabilityHint).toContain("lemmikust");
  });

  it("defines request modal care-date helper in English and Estonian", () => {
    expect(en.requests.selectDatesHint).toContain("selected pet");
    expect(en.requests.selectDatesHint).toContain("bookings");
    expect(et.requests.selectDatesHint).toContain("lemmiku");
    expect(et.requests.selectDatesHint).toContain("broneeringud");
  });
});
