import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MATCHES_PATH,
  isAllowedIncompleteProfilePath,
  isMatchesPath,
  shouldRedirectIncompleteProfileToSetup,
} from "@/lib/profile-route-guard";
import { en } from "@/i18n/en";
import { et } from "@/i18n/et";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("incomplete profile route guard", () => {
  it("keeps Matches on /matches instead of sending the user to profile setup", () => {
    expect(isMatchesPath("/matches")).toBe(true);
    expect(isAllowedIncompleteProfilePath("/matches")).toBe(true);
    expect(shouldRedirectIncompleteProfileToSetup("/matches")).toBe(false);
    expect(shouldRedirectIncompleteProfileToSetup("/matches/extra")).toBe(false);
  });

  it("still sends unrelated incomplete-profile pages to setup", () => {
    expect(shouldRedirectIncompleteProfileToSetup("/users/someone")).toBe(true);
  });

  it("does not redirect Dashboard, Calendar, Bookings, Saved, Requests, Edit Profile, or Membership", () => {
    expect(shouldRedirectIncompleteProfileToSetup("/dashboard")).toBe(false);
    expect(shouldRedirectIncompleteProfileToSetup("/dashboard/calendar")).toBe(false);
    expect(shouldRedirectIncompleteProfileToSetup("/dashboard/bookings")).toBe(false);
    expect(shouldRedirectIncompleteProfileToSetup("/saved")).toBe(false);
    expect(shouldRedirectIncompleteProfileToSetup("/requests")).toBe(false);
    expect(shouldRedirectIncompleteProfileToSetup("/profile/edit")).toBe(false);
    expect(shouldRedirectIncompleteProfileToSetup("/profile/setup")).toBe(false);
    expect(shouldRedirectIncompleteProfileToSetup("/membership")).toBe(false);
    expect(shouldRedirectIncompleteProfileToSetup("/messages")).toBe(false);
    expect(shouldRedirectIncompleteProfileToSetup("/pets")).toBe(false);
  });

  it("uses the shared helper in the live profile route guard", () => {
    const hook = readSource("src/hooks/useRequireCompleteProfile.ts");
    expect(hook).toContain("shouldRedirectIncompleteProfileToSetup(pathname)");
    expect(hook).not.toMatch(/if \(isIncomplete &&[\s\S]*!onAllowedIncomplete/);
  });
});

describe("Matches incomplete vs complete profile UI", () => {
  const source = readSource("src/components/matches/MatchesPageContent.tsx");

  it("shows a locked Matches empty state when the profile is incomplete", () => {
    expect(source).toContain("isIncomplete");
    expect(source).toContain("copy.lockedTitle");
    expect(source).toContain("copy.lockedCta");
    expect(source).toContain('href: "/profile/setup"');
    expect(en.matches.lockedTitle).toBe("Complete your profile to start getting matches.");
    expect(en.matches.lockedCta).toBe("Complete my profile");
    expect(et.matches.lockedTitle).toBe("Täida oma profiil, et hakata sobivusi saama.");
    expect(et.matches.lockedCta).toBe("Täida minu profiil");
  });

  it("does not fetch match suggestions until the profile is complete", () => {
    expect(source).toMatch(
      /if \(isIncomplete\) \{[\s\S]*setRows\(\[\]\);[\s\S]*setLoading\(false\);[\s\S]*return;[\s\S]*fetchOwnMatchSuggestions/,
    );
  });

  it("loads Matches normally for a complete profile", () => {
    expect(source).toContain("fetchOwnMatchSuggestions(supabase, userId)");
    expect(source).toContain("copy.emptyTitle");
  });

  it("keeps the Matches page route at /matches", () => {
    const page = readSource("src/app/(account)/matches/page.tsx");
    expect(page).toContain("MatchesPageContent");
    expect(MATCHES_PATH).toBe("/matches");
  });
});
