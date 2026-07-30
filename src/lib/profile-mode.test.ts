import { describe, expect, it } from "vitest";
import {
  canSwitchActiveMode,
  isEnablingSecondRole,
  mergedRoleForEnable,
  parseProfileSetupEnableParam,
  profileSetupEnableHref,
  resolveActiveMode,
  roleAfterModeSwitch,
  sidebarModeControlForProfile,
} from "@/lib/profile-mode";
import type { ProfileRow } from "@/lib/profile-utils";

function profile(partial: Partial<ProfileRow> & Pick<ProfileRow, "role">): ProfileRow {
  return {
    id: "user-1",
    display_name: "Test User",
    avatar_url: null,
    bio: null,
    location: null,
    role: partial.role,
    active_mode: partial.active_mode ?? null,
    languages: [],
    phone: null,
    is_public: true,
    rating_avg: 0,
    rating_count: 0,
    membership_status: "Demo",
    details: partial.details ?? {},
    memberships: partial.memberships ?? { pet_parent: null, pet_friend: null },
    ...partial,
  } as ProfileRow;
}

describe("roleAfterModeSwitch", () => {
  it("does not promote pet_parent to both when switching toward pet_friend", () => {
    expect(roleAfterModeSwitch("pet_parent", "pet_friend")).toBe("pet_parent");
  });

  it("does not promote pet_friend to both when switching toward pet_parent", () => {
    expect(roleAfterModeSwitch("pet_friend", "pet_parent")).toBe("pet_friend");
  });

  it("keeps both unchanged", () => {
    expect(roleAfterModeSwitch("both", "pet_friend")).toBe("both");
  });
});

describe("canSwitchActiveMode", () => {
  it("allows both-role users to switch to either mode", () => {
    expect(canSwitchActiveMode("both", "pet_friend")).toBe(true);
    expect(canSwitchActiveMode("both", "pet_parent")).toBe(true);
  });

  it("blocks single-role users from the other mode", () => {
    expect(canSwitchActiveMode("pet_parent", "pet_friend")).toBe(false);
    expect(canSwitchActiveMode("pet_friend", "pet_parent")).toBe(false);
  });

  it("allows same-mode switch target for single-role users", () => {
    expect(canSwitchActiveMode("pet_parent", "pet_parent")).toBe(true);
    expect(canSwitchActiveMode("pet_friend", "pet_friend")).toBe(true);
  });
});

describe("resolveActiveMode", () => {
  it("clamps pet_parent away from stored pet_friend active_mode", () => {
    expect(resolveActiveMode("pet_parent", "pet_friend")).toBe("pet_parent");
  });

  it("clamps pet_friend away from stored pet_parent active_mode", () => {
    expect(resolveActiveMode("pet_friend", "pet_parent")).toBe("pet_friend");
  });

  it("honours both-role active_mode values", () => {
    expect(resolveActiveMode("both", "pet_friend")).toBe("pet_friend");
    expect(resolveActiveMode("both", "pet_parent")).toBe("pet_parent");
  });
});

describe("sidebarModeControlForProfile", () => {
  it("shows mode switch for both-role users", () => {
    const control = sidebarModeControlForProfile(
      profile({ role: "both", active_mode: "pet_parent" }),
    );
    expect(control).toEqual({
      kind: "switch",
      label: "Switch to Pet Friend",
      targetMode: "pet_friend",
    });
  });

  it("shows enable Pet Friend CTA for pet_parent users", () => {
    const control = sidebarModeControlForProfile(
      profile({ role: "pet_parent", active_mode: "pet_parent" }),
    );
    expect(control).toEqual({
      kind: "enable",
      label: "Create Pet Friend profile",
      href: "/profile/setup?enable=pet_friend",
      targetMode: "pet_friend",
    });
  });

  it("shows enable Pet Parent CTA for pet_friend users", () => {
    const control = sidebarModeControlForProfile(
      profile({ role: "pet_friend", active_mode: "pet_friend" }),
    );
    expect(control).toEqual({
      kind: "enable",
      label: "Create Pet Parent profile",
      href: "/profile/setup?enable=pet_parent",
      targetMode: "pet_parent",
    });
  });

  it("does not expose ordinary mode switch for single-role users", () => {
    const parentControl = sidebarModeControlForProfile(
      profile({ role: "pet_parent", active_mode: "pet_parent" }),
    );
    const friendControl = sidebarModeControlForProfile(
      profile({ role: "pet_friend", active_mode: "pet_friend" }),
    );
    expect(parentControl?.kind).toBe("enable");
    expect(friendControl?.kind).toBe("enable");
  });
});

describe("profile setup enable flow", () => {
  it("builds setup href with enable query for the target mode", () => {
    expect(profileSetupEnableHref("pet_parent")).toBe("/profile/setup?enable=pet_parent");
  });

  it("detects second-role setup for single-role users", () => {
    const friendProfile = profile({
      role: "pet_friend",
      active_mode: "pet_friend",
      role_chosen_at: "2026-01-01T00:00:00.000Z",
    });
    expect(isEnablingSecondRole(friendProfile, parseProfileSetupEnableParam("pet_parent"))).toBe(
      true,
    );
    expect(isEnablingSecondRole(friendProfile, parseProfileSetupEnableParam("pet_friend"))).toBe(
      false,
    );
    expect(isEnablingSecondRole(friendProfile, null)).toBe(false);
  });

  it("merges single role into both when enabling the other role", () => {
    expect(mergedRoleForEnable("pet_friend", "pet_parent")).toBe("both");
    expect(mergedRoleForEnable("pet_parent", "pet_friend")).toBe("both");
    expect(mergedRoleForEnable("both", "pet_parent")).toBe("both");
  });
});
