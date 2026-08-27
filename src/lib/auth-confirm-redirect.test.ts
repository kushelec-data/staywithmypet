import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PASSWORD_RESET_PATH } from "@/lib/auth-recovery";
import {
  resolveConfirmRedirectPath,
  shouldForwardHomepageToAuthConfirm,
} from "@/lib/auth-confirm-redirect";
import {
  DASHBOARD_PATH,
  PROFILE_SETUP_PATH,
  ROLE_ONBOARDING_PATH,
  resolveLoginReturnPath,
  resolvePostLoginPath,
} from "@/lib/auth-routing";
import type { ProfileRow } from "@/lib/profile-utils";

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

function completeProfile(partial: Partial<ProfileRow> = {}): ProfileRow {
  return profile({
    display_name: "Alex Johnson",
    bio: "I love spending time with pets and helping neighbours.",
    location: "Tallinn, Estonia",
    languages: ["en"],
    role_chosen_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  });
}

describe("email confirmation redirect", () => {
  it("keeps signup emailRedirectTo on /auth/confirm?next=/dashboard", () => {
    const authForm = readSource("src/components/auth/AuthForm.tsx");
    const authHelper = readSource("src/lib/auth.ts");
    expect(authForm).toContain("getAuthConfirmUrl(DASHBOARD_PATH)");
    expect(authHelper).toContain('`${origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`');
  });

  it("sends a newly confirmed email user with no role to role onboarding", () => {
    const newUser = profile({ role: "pet_friend", role_chosen_at: null });
    expect(
      resolveConfirmRedirectPath(newUser, "/dashboard", "signup"),
    ).toBe(ROLE_ONBOARDING_PATH);
    expect(resolveConfirmRedirectPath(null, "/dashboard", "signup")).toBe(ROLE_ONBOARDING_PATH);
    expect(resolveConfirmRedirectPath(newUser, null, "email")).toBe(ROLE_ONBOARDING_PATH);
  });

  it("does not send a new confirmed user to the homepage", () => {
    const newUser = profile({ role_chosen_at: null });
    expect(resolveConfirmRedirectPath(newUser, "/", "signup")).not.toBe("/");
    expect(resolveConfirmRedirectPath(newUser, "/", "signup")).toBe(ROLE_ONBOARDING_PATH);
    expect(resolveLoginReturnPath("/")).toBeNull();
  });

  it("overrides next=/dashboard when role_chosen_at is null", () => {
    expect(
      resolvePostLoginPath(profile({ role_chosen_at: null }), "/dashboard"),
    ).toBe(ROLE_ONBOARDING_PATH);
  });

  it("sends an explicit Pet Parent with incomplete profile to profile setup", () => {
    const parent = profile({
      role: "pet_parent",
      active_mode: "pet_parent",
      role_chosen_at: "2026-08-27T00:00:00.000Z",
    });
    expect(resolveConfirmRedirectPath(parent, "/dashboard", "signup")).toBe(PROFILE_SETUP_PATH);
    const onboarding = readSource("src/components/onboarding/RoleOnboardingContent.tsx");
    expect(onboarding).toContain("isProfileIncomplete(saved) ? PROFILE_SETUP_PATH : DASHBOARD_PATH");
  });

  it("sends an explicit Pet Friend with incomplete profile to profile setup", () => {
    const friend = profile({
      role: "pet_friend",
      active_mode: "pet_friend",
      role_chosen_at: "2026-08-27T00:00:00.000Z",
    });
    expect(resolveConfirmRedirectPath(friend, "/dashboard", "signup")).toBe(PROFILE_SETUP_PATH);
  });

  it("lets a fully onboarded user keep a safe next destination", () => {
    const existing = completeProfile({ role: "pet_parent", active_mode: "pet_parent" });
    expect(resolveConfirmRedirectPath(existing, "/messages", "signup")).toBe("/messages");
    expect(resolvePostLoginPath(existing, "/dashboard")).toBe("/dashboard");
  });

  it("rejects unsafe external next values", () => {
    const existing = completeProfile();
    expect(resolveLoginReturnPath("https://evil.test")).toBeNull();
    expect(resolveLoginReturnPath("//evil.test/phish")).toBeNull();
    expect(resolveConfirmRedirectPath(existing, "https://evil.test", "signup")).toBe(DASHBOARD_PATH);
  });

  it("keeps password recovery on the reset-password route", () => {
    expect(
      resolveConfirmRedirectPath(profile({ role_chosen_at: null }), "/dashboard", "recovery"),
    ).toBe(PASSWORD_RESET_PATH);
    expect(
      resolveConfirmRedirectPath(null, "/reset-password", "recovery"),
    ).toBe(PASSWORD_RESET_PATH);
  });

  it("forwards homepage confirmation tokens to /auth/confirm", () => {
    const params = new URLSearchParams("token_hash=abc&type=signup&next=%2Fdashboard");
    expect(shouldForwardHomepageToAuthConfirm("/", params)).toBe(true);
    expect(shouldForwardHomepageToAuthConfirm("/", new URLSearchParams("code=pkce"))).toBe(true);
    expect(shouldForwardHomepageToAuthConfirm("/", new URLSearchParams())).toBe(false);
    expect(shouldForwardHomepageToAuthConfirm("/signup", params)).toBe(false);

    const middleware = readSource("src/middleware.ts");
    expect(middleware).toContain("shouldForwardHomepageToAuthConfirm");
    expect(middleware).toContain('confirmUrl.pathname = "/auth/confirm"');

    const confirm = readSource("src/app/auth/confirm/route.ts");
    expect(confirm).toContain("resolveConfirmRedirectPath");
    expect(confirm).toContain("createRouteHandlerClient");
    expect(confirm).not.toContain("return redirectTo(url.origin, next)");
  });

  it("sends new Google users with no chosen role to role onboarding", () => {
    const callback = readSource("src/app/auth/callback/route.ts");
    expect(callback).toContain("resolvePostLoginPath");
    expect(resolvePostLoginPath(profile({ role_chosen_at: null }), "/dashboard")).toBe(
      ROLE_ONBOARDING_PATH,
    );
  });

  it("does not infer Pet Friend from the database default after confirmation", () => {
    const row = profile({
      role: "pet_friend",
      active_mode: "pet_friend",
      role_chosen_at: null,
    });
    expect(resolveConfirmRedirectPath(row, "/dashboard", "signup")).toBe(ROLE_ONBOARDING_PATH);
  });
});
