import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DASHBOARD_PATH, ROLE_ONBOARDING_PATH, resolvePostAuthPath, resolvePostLoginPath } from "@/lib/auth-routing";
import { needsRoleOnboarding, type ProfileRow } from "@/lib/profile-utils";
import {
  canSaveOnboardingRole,
  initialOnboardingRoleSelection,
  onboardingSelectionFromProfile,
  accountPathForRoleState,
} from "@/lib/role-onboarding";
import { getUserMenuLinks } from "@/lib/nav-i18n";
import { resolveActiveMode } from "@/lib/profile-mode";
import { en } from "@/i18n/en";
import { et } from "@/i18n/et";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function profile(partial: Partial<ProfileRow>): ProfileRow {
  return {
    id: "user-1",
    display_name: "Test User",
    avatar_url: null,
    bio: null,
    location: null,
    address: null,
    formatted_address: null,
    city: null,
    country: null,
    postal_code: null,
    google_place_id: null,
    public_location: null,
    latitude: null,
    longitude: null,
    role: "pet_friend",
    active_mode: "pet_friend",
    role_chosen_at: null,
    languages: [],
    phone: null,
    phone_country_code: null,
    phone_number: null,
    phone_e164: null,
    phone_verified: false,
    emergency_contact_name: null,
    emergency_contact_phone_country_code: null,
    emergency_contact_phone_number: null,
    emergency_contact_phone_e164: null,
    trust_score: 0,
    is_public: true,
    rating_avg: 0,
    rating_count: 0,
    membership_status: "Demo",
    memberships: { pet_parent: null, pet_friend: null },
    welcome_offer_eligible_by_role: { pet_parent: false, pet_friend: false },
    details: {},
    ...partial,
  } as ProfileRow;
}

describe("brand-new account role onboarding", () => {
  it("starts with no role chosen", () => {
    const row = profile({ role: "pet_friend", active_mode: "pet_parent", role_chosen_at: null });
    expect(needsRoleOnboarding(row)).toBe(true);
    expect(onboardingSelectionFromProfile(row)).toBeNull();
    expect(initialOnboardingRoleSelection()).toBeNull();
  });

  it("does not select Pet Friend by default", () => {
    expect(initialOnboardingRoleSelection()).not.toBe("pet_friend");
    const source = readSource("src/components/onboarding/RoleOnboardingContent.tsx");
    expect(source).toContain("initialOnboardingRoleSelection()");
    expect(source).not.toContain('useState<OnboardingRole>("pet_friend")');
    expect(source).not.toMatch(/useState<OnboardingRole \| null>\("pet_friend"\)/);
  });

  it("does not select Pet Parent by default", () => {
    expect(initialOnboardingRoleSelection()).not.toBe("pet_parent");
    expect(onboardingSelectionFromProfile(profile({ role: "pet_parent", role_chosen_at: null }))).toBeNull();
  });

  it("blocks continue without selection and does not treat that as saveable", () => {
    expect(canSaveOnboardingRole(null)).toBe(false);
    expect(en.onboarding.role.selectionRequired).toBe(
      "Please choose how you'd like to use StayWithMyPet.",
    );
    expect(et.onboarding.role.selectionRequired).toBe(
      "Palun vali, kuidas soovid StayWithMyPet'i kasutada.",
    );
    const source = readSource("src/components/onboarding/RoleOnboardingContent.tsx");
    expect(source).toContain("if (!canSaveOnboardingRole(role))");
    expect(source).toContain("setError(t.onboarding.role.selectionRequired)");
    expect(source).toMatch(/if \(!canSaveOnboardingRole\(role\)\) \{[\s\S]*return;/);
    const saveCall = source.indexOf("await saveUserRole");
    const gate = source.indexOf("if (!canSaveOnboardingRole(role))");
    expect(gate).toBeGreaterThan(-1);
    expect(saveCall).toBeGreaterThan(gate);
  });

  it("saves pet_parent only after explicit selection", () => {
    expect(canSaveOnboardingRole("pet_parent")).toBe(true);
    const source = readSource("src/components/onboarding/RoleOnboardingContent.tsx");
    expect(source).toContain("saveUserRole(supabase, user.id, role");
  });

  it("saves pet_friend only after explicit selection", () => {
    expect(canSaveOnboardingRole("pet_friend")).toBe(true);
  });

  it("sends a no-role user navigating to Dashboard back to role onboarding", () => {
    const row = profile({ role: "pet_friend", role_chosen_at: null });
    expect(accountPathForRoleState(row)).toBe(ROLE_ONBOARDING_PATH);
    expect(resolvePostAuthPath(row)).toBe(ROLE_ONBOARDING_PATH);
    const guard = readSource("src/hooks/useRequireCompleteProfile.ts");
    expect(guard).toContain("if (rolePending && !onRoleOnboardingPage)");
    expect(guard).toContain("router.replace(ROLE_ONBOARDING_PATH)");
    expect(
      getUserMenuLinks(en.navbar, row, { hideDashboard: true }).some((item) => item.href === "/dashboard"),
    ).toBe(false);
  });

  it("lets an existing Pet Parent reach Dashboard", () => {
    const row = profile({
      role: "pet_parent",
      active_mode: "pet_parent",
      role_chosen_at: "2026-01-01T00:00:00.000Z",
      bio: "I care for my pets with help from trusted friends nearby.",
      location: "Tallinn",
      languages: ["en"],
    });
    expect(needsRoleOnboarding(row)).toBe(false);
    expect(accountPathForRoleState(row)).toBe(DASHBOARD_PATH);
    expect(resolvePostAuthPath(row)).toBe(DASHBOARD_PATH);
  });

  it("lets an existing Pet Friend reach Dashboard", () => {
    const row = profile({
      role: "pet_friend",
      active_mode: "pet_friend",
      role_chosen_at: "2026-01-01T00:00:00.000Z",
      bio: "I spend time with animals and help pet parents nearby.",
      location: "Tartu",
      languages: ["et"],
    });
    expect(needsRoleOnboarding(row)).toBe(false);
    expect(accountPathForRoleState(row)).toBe(DASHBOARD_PATH);
  });

  it("requires role selection after email signup", () => {
    const authForm = readSource("src/components/auth/AuthForm.tsx");
    expect(authForm).toContain("resolvePostLoginPath");
    expect(resolvePostLoginPath(profile({ role_chosen_at: null }), null)).toBe(ROLE_ONBOARDING_PATH);
    expect(resolvePostAuthPath(null)).toBe(ROLE_ONBOARDING_PATH);
  });

  it("requires role selection after Google signup", () => {
    const callback = readSource("src/app/auth/callback/route.ts");
    expect(callback).toContain("resolvePostLoginPath");
    expect(resolvePostLoginPath(profile({ role_chosen_at: null }), "/dashboard")).toBe(
      ROLE_ONBOARDING_PATH,
    );
  });

  it("does not assign a role on refresh of the onboarding screen", () => {
    const source = readSource("src/components/onboarding/RoleOnboardingContent.tsx");
    const beforeSubmit = source.split("async function handleSubmit")[0];
    expect(beforeSubmit).not.toContain("saveUserRole(");
    expect(source).toContain("onboardingSelectionFromProfile(profile)");
    const row = profile({ role: "pet_friend", role_chosen_at: null });
    expect(onboardingSelectionFromProfile(row)).toBeNull();
  });

  it("does not treat active_mode as a role selection", () => {
    const row = profile({
      role: "pet_friend",
      active_mode: "pet_friend",
      role_chosen_at: null,
    });
    expect(needsRoleOnboarding(row)).toBe(true);
    expect(onboardingSelectionFromProfile(row)).toBeNull();
    expect(resolveActiveMode(row.role, row.active_mode)).toBe("pet_friend");
    expect(canSaveOnboardingRole(null)).toBe(false);
  });
});

describe("ensureUserProfile does not write a chosen role", () => {
  it("inserts a profile without role, active_mode, or role_chosen_at", () => {
    const source = readSource("src/lib/profile.ts");
    expect(source).toContain("from(\"profiles\").insert");
    expect(source).not.toMatch(/insert\(\{[\s\S]*role:/);
    expect(source).not.toMatch(/insert\(\{[\s\S]*active_mode:/);
    expect(source).not.toMatch(/insert\(\{[\s\S]*role_chosen_at:/);
  });
});
