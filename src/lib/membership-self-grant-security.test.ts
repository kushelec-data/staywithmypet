import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as membershipActions from "@/app/actions/membership";

const PROJECT_ROOT = process.cwd();

function walkTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      files.push(...walkTsFiles(full));
      continue;
    }
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("membership self-grant prevention", () => {
  it("does not export a manual/demo membership activation server action", () => {
    expect(membershipActions).not.toHaveProperty("activateMembershipAction");
    expect(Object.keys(membershipActions)).toEqual(
      expect.arrayContaining([
        "cancelMembershipAction",
        "refreshProfileMembershipsAction",
        "getMembershipsForActiveModeAction",
      ]),
    );

    const source = readFileSync(join(PROJECT_ROOT, "src/app/actions/membership.ts"), "utf8");
    expect(source).not.toContain("activateMembershipAction");
    expect(source).not.toContain("ActivateMembershipInput");
    expect(source).not.toContain("upsertUserMembershipAsAdmin");
    expect(source).toContain("cancelMembershipAction");
  });

  it("keeps upsertUserMembershipAsAdmin off public app actions and non-Stripe API routes", () => {
    const actionFiles = existsSync(join(PROJECT_ROOT, "src/app/actions"))
      ? walkTsFiles(join(PROJECT_ROOT, "src/app/actions"))
      : [];
    const apiFiles = existsSync(join(PROJECT_ROOT, "src/app/api"))
      ? walkTsFiles(join(PROJECT_ROOT, "src/app/api"))
      : [];

    for (const file of actionFiles) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("upsertUserMembershipAsAdmin");
      expect(source).not.toMatch(/function activateMembershipAction/);
    }

    for (const file of apiFiles) {
      const relative = file.replace(`${PROJECT_ROOT}\\`, "").replace(`${PROJECT_ROOT}/`, "");
      const source = readFileSync(file, "utf8");
      if (relative.includes("api/stripe/webhook")) continue;
      expect(source, relative).not.toContain("upsertUserMembershipAsAdmin");
    }
  });
});
