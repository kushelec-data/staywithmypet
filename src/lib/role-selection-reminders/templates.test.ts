import { describe, expect, it } from "vitest";
import { ROLE_ONBOARDING_PATH } from "@/lib/auth-routing";
import {
  ROLE_SELECTION_INTERNAL_TEST_SUBJECT_PREFIX,
  ROLE_SELECTION_INTERNAL_TEST_SUBJECT_PREFIX_STAGE2,
} from "./config";
import { ROLE_SELECTION_REMINDER_1_COPY, ROLE_SELECTION_REMINDER_2_COPY } from "./copy";
import {
  buildRoleSelectionReminder1Email,
  buildRoleSelectionReminder2Email,
  markRoleSelectionInternalTestEmail,
} from "./templates";

describe("role selection Reminder 1 templates", () => {
  it("preserves the approved Estonian wording and role-selection CTA", () => {
    const et = buildRoleSelectionReminder1Email("et");
    const copy = ROLE_SELECTION_REMINDER_1_COPY.et;
    expect(et.subject).toBe(copy.subject);
    expect(et.html).toContain(copy.preheader);
    expect(et.html).toContain("Tere!");
    expect(et.html).not.toContain("Tere, ");
    expect(et.html).toContain("Olen loomaomanik");
    expect(et.html).toContain("Olen loomasõber");
    expect(et.html).toContain("Alusta siin");
    expect(et.html).toContain(`https://www.staywithmypet.ee${ROLE_ONBOARDING_PATH}`);
    expect(et.html).not.toContain("/profile/edit");
    expect(et.html).not.toContain("/pets/new");
  });

  it("preserves the approved English wording and role-selection CTA", () => {
    const en = buildRoleSelectionReminder1Email("en");
    const copy = ROLE_SELECTION_REMINDER_1_COPY.en;
    expect(en.subject).toBe(copy.subject);
    expect(en.html).toContain(copy.preheader);
    expect(en.html).toContain(">Hi!</");
    expect(en.html).toContain("I'm a Pet Parent");
    expect(en.html).toContain("Get Started");
    expect(en.html).toContain(`https://www.staywithmypet.ee${ROLE_ONBOARDING_PATH}`);
    expect(en.text).toContain("I'm a Pet Friend");
  });

  it("marks internal tests with the role-reminder prefix", () => {
    const customer = buildRoleSelectionReminder1Email("en");
    const internal = markRoleSelectionInternalTestEmail(customer);
    expect(internal.subject).toBe(
      `${ROLE_SELECTION_INTERNAL_TEST_SUBJECT_PREFIX} ${ROLE_SELECTION_REMINDER_1_COPY.en.subject}`,
    );
    expect(internal.html).toContain("INTERNAL TEST ONLY");
    expect(internal.html).not.toContain("@gmail.com");
  });
});

describe("role selection Reminder 2 templates", () => {
  it("preserves the approved Estonian Reminder 2 wording and role-selection CTA", () => {
    const et = buildRoleSelectionReminder2Email("et");
    const copy = ROLE_SELECTION_REMINDER_2_COPY.et;
    expect(et.subject).toBe(copy.subject);
    expect(et.html).toContain(copy.preheader);
    expect(et.html).toContain("Tere!");
    expect(et.html).toContain(copy.intro);
    expect(et.html).toContain("Loomaomanik");
    expect(et.html).toContain("Loomasõber");
    expect(et.html).toContain("Vali oma roll");
    expect(et.html).toContain(`https://www.staywithmypet.ee${ROLE_ONBOARDING_PATH}`);
    expect(et.html).not.toContain("/profile/edit");
    expect(et.text).toContain(copy.membership);
  });

  it("preserves the approved English Reminder 2 wording and role-selection CTA", () => {
    const en = buildRoleSelectionReminder2Email("en");
    const copy = ROLE_SELECTION_REMINDER_2_COPY.en;
    expect(en.subject).toBe(copy.subject);
    expect(en.html).toContain(copy.preheader);
    expect(en.html).toContain(">Hi!</");
    expect(en.html).toContain("Just one small step left");
    expect(en.html).toContain("Pet Parent");
    expect(en.html).toContain("Choose Your Role");
    expect(en.html).toContain(`https://www.staywithmypet.ee${ROLE_ONBOARDING_PATH}`);
    expect(en.text).toContain("Choose Your Role");
  });

  it("marks Reminder 2 internal tests with the stage-2 prefix", () => {
    const customer = buildRoleSelectionReminder2Email("en");
    const internal = markRoleSelectionInternalTestEmail(customer, 2);
    expect(internal.subject).toBe(
      `${ROLE_SELECTION_INTERNAL_TEST_SUBJECT_PREFIX_STAGE2} ${ROLE_SELECTION_REMINDER_2_COPY.en.subject}`,
    );
    expect(internal.subject).not.toContain("ROLE REMINDER 1");
  });
});
