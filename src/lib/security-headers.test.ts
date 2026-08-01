import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicyReportOnly,
  buildSecurityHeaders,
  supabaseCspOrigins,
} from "@/lib/security-headers";

const PROJECT_ROOT = process.cwd();

describe("security headers configuration", () => {
  it("next.config.ts applies buildSecurityHeaders to all routes", () => {
    const config = readFileSync(join(PROJECT_ROOT, "next.config.ts"), "utf8");
    expect(config).toContain("buildSecurityHeaders");
    expect(config).toMatch(/source:\s*["']\/:path\*["']/);
  });

  it("includes required security response headers", () => {
    const headers = buildSecurityHeaders();
    const byKey = Object.fromEntries(headers.map((h) => [h.key, h.value]));

    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(byKey["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains",
    );
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
    expect(byKey["Content-Security-Policy-Report-Only"]).toBeTruthy();
  });

  it("CSP Report-Only allows verified third-party domains only", () => {
    const csp = buildContentSecurityPolicyReportOnly();

    expect(csp).toContain("https://www.googletagmanager.com");
    expect(csp).toContain("https://connect.facebook.net");
    expect(csp).toContain("https://maps.googleapis.com");
    expect(csp).toContain("https://maps.gstatic.com");
    expect(csp).toContain("https://vitals.vercel-insights.com");
    expect(csp).toContain("https://va.vercel-scripts.com");
    expect(csp).toContain("https://www.openstreetmap.org");
    expect(csp).toContain("https://*.tile.openstreetmap.org");
    expect(csp).toContain("https://lh3.googleusercontent.com");
    expect(csp).toContain("https://*.googleusercontent.com");
    expect(csp).toContain("'unsafe-inline'");
    expect(csp).not.toContain("js.stripe.com");
  });

  it("includes Supabase origin from NEXT_PUBLIC_SUPABASE_URL when set", () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    try {
      expect(supabaseCspOrigins()).toEqual([
        "https://example.supabase.co",
        "wss://example.supabase.co",
      ]);
      expect(buildContentSecurityPolicyReportOnly()).toContain(
        "https://example.supabase.co",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
      }
    }
  });
});

describe("removed debug API routes", () => {
  it("env-check route file no longer exists", () => {
    expect(
      existsSync(join(PROJECT_ROOT, "src/app/api/debug/env-check/route.ts")),
    ).toBe(false);
  });

  it("stripe-runtime debug route file no longer exists", () => {
    expect(
      existsSync(join(PROJECT_ROOT, "src/app/api/debug/stripe-runtime/route.ts")),
    ).toBe(false);
  });
});
