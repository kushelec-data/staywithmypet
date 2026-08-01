import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = process.cwd();

describe("active membership user IDs endpoint protection", () => {
  it("public active-membership-user-ids route no longer exists", () => {
    expect(
      existsSync(
        join(
          PROJECT_ROOT,
          "src/app/api/marketplace/active-membership-user-ids/route.ts",
        ),
      ),
    ).toBe(false);
  });

  it("client marketplace module does not fetch membership UUID lists", () => {
    const file = readFileSync(
      join(PROJECT_ROOT, "src/lib/marketplace-membership.ts"),
      "utf8",
    );
    expect(file).not.toMatch(/active-membership-user-ids/);
    expect(file).not.toMatch(/\bfetch\s*\(/);
    expect(file).not.toMatch(/userIds/);
  });

  it("server membership filters load IDs via service role, not browser API", () => {
    const file = readFileSync(
      join(PROJECT_ROOT, "src/lib/marketplace-membership-server.ts"),
      "utf8",
    );
    expect(file).toContain("loadActiveMembershipUserIds");
    expect(file).not.toMatch(/active-membership-user-ids/);
    expect(file).not.toMatch(/\bfetch\s*\(/);
  });
});
