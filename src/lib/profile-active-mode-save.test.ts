import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ActiveModeSwitchError } from "@/lib/profile-mode";

describe("saveUserActiveMode role decoupling", () => {
  it("does not write profiles.role when saving active_mode", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/profile-setup.ts"),
      "utf8",
    );
    const fn = source.slice(
      source.indexOf("export async function saveUserActiveMode"),
      source.indexOf("export async function saveUserProfile"),
    );
    expect(fn).not.toMatch(/\brole:\s*newRole/);
    expect(fn).not.toMatch(/\brole:\s*roleAfterModeSwitch/);
    expect(fn).toContain("active_mode: targetMode");
    expect(fn).not.toMatch(/payload\s*=\s*\{[\s\S]*\brole:/);
  });

  it("throws ActiveModeSwitchError for unsupported mode", () => {
    const err = new ActiveModeSwitchError(
      "unsupported_mode",
      "Complete setup for the other role before switching dashboard mode.",
    );
    expect(err.code).toBe("unsupported_mode");
  });
});

describe("membership activation does not mutate profile role", () => {
  it("upsertUserMembership only syncs membership_status on profiles", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/membership-activate.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/from\("profiles"\)\.update\(\{[^}]*role:/);
    expect(source).toContain("membership_status");
  });
});

describe("membership cancellation does not mutate profile role", () => {
  it("cancel path updates membership row status only", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/membership-activate.ts"),
      "utf8",
    );
    const cancelFn = source.slice(source.indexOf("export async function cancelUserMembershipAsAdmin"));
    expect(cancelFn).not.toMatch(/profiles.*role/);
  });
});
