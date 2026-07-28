import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MEMBERSHIP_FLOATING_BANNER_DISMISS_KEY,
  MEMBERSHIP_FLOATING_BANNER_DISMISS_TTL_MS,
  clearMembershipFloatingBannerDismissal,
  dismissMembershipFloatingBanner,
  isMembershipFloatingBannerDismissed,
} from "@/lib/membership-floating-banner";

describe("membership floating banner dismissal", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem(key: string) {
          return store[key] ?? null;
        },
        setItem(key: string, value: string) {
          store[key] = value;
        },
        removeItem(key: string) {
          delete store[key];
        },
      },
    });
    clearMembershipFloatingBannerDismissal();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("3. close dismissal persists after refresh", () => {
    dismissMembershipFloatingBanner(1_000);
    expect(window.localStorage.getItem(MEMBERSHIP_FLOATING_BANNER_DISMISS_KEY)).toBe("1000");
    expect(isMembershipFloatingBannerDismissed(2_000)).toBe(true);
  });

  it("5. banner reappears after 7 days", () => {
    const dismissedAt = 1_000;
    dismissMembershipFloatingBanner(dismissedAt);
    expect(
      isMembershipFloatingBannerDismissed(
        dismissedAt + MEMBERSHIP_FLOATING_BANNER_DISMISS_TTL_MS - 1,
      ),
    ).toBe(true);
    expect(
      isMembershipFloatingBannerDismissed(
        dismissedAt + MEMBERSHIP_FLOATING_BANNER_DISMISS_TTL_MS,
      ),
    ).toBe(false);
  });
});

describe("MembershipFloatingDogBanner wiring", () => {
  const bannerSource = readFileSync(
    join(process.cwd(), "src/components/membership/MembershipFloatingDogBanner.tsx"),
    "utf8",
  );
  const pageSource = readFileSync(
    join(process.cwd(), "src/components/membership/MembershipPageContent.tsx"),
    "utf8",
  );
  const pricingSource = readFileSync(
    join(process.cwd(), "src/sections/PricingSection.tsx"),
    "utf8",
  );
  const cssSource = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("1. banner appears on eligible membership pages", () => {
    expect(pageSource).toContain("<MembershipFloatingDogBanner");
    expect(pricingSource).toContain("<MembershipFloatingDogBanner");
  });

  it("2. banner enters only once per mount", () => {
    expect(bannerSource).toContain('useEffect(() => {');
    expect(bannerSource).toContain('enteredRef.current = true');
    expect(bannerSource).toMatch(/setPhase\("entering"\)/);
  });

  it("3. close button dismisses and stores timestamp", () => {
    expect(bannerSource).toContain("dismissMembershipFloatingBanner");
    expect(bannerSource).toContain('setPhase("closing")');
    expect(bannerSource).toContain("aria-label={copy.closeLabel}");
  });

  it("6. view plans scrolls to membership plans", () => {
    expect(bannerSource).toContain("scrollToMembershipPlans");
  });

  it("7. recommended plan highlight uses existing scroll helper", () => {
    const scrollSource = readFileSync(
      join(process.cwd(), "src/lib/membership-plans-scroll.ts"),
      "utf8",
    );
    expect(bannerSource).toContain("scrollToMembershipPlans");
    expect(scrollSource).toContain("membership-plan-popular-highlight");
  });

  it("8. reduced-motion mode disables animation", () => {
    expect(cssSource).toContain("@media (prefers-reduced-motion: reduce)");
    expect(cssSource).toContain(".membership-floating-banner-enter");
    expect(cssSource).toMatch(
      /prefers-reduced-motion: reduce[\s\S]*\.membership-floating-banner-enter[\s\S]*animation: none/,
    );
  });

  it("9. mobile layout avoids overflow", () => {
    expect(bannerSource).toContain("max-w-[880px]");
    expect(bannerSource).toContain("flex-col");
    expect(bannerSource).toContain("min-w-0");
  });

  it("10. banner does not render twice on authenticated membership page", () => {
    expect(pageSource.match(/<MembershipFloatingDogBanner/g)?.length).toBe(1);
    expect(pricingSource.match(/<MembershipFloatingDogBanner/g)?.length).toBe(1);
  });

  it("uses fixed portal rendering without layout shift", () => {
    expect(bannerSource).toContain("createPortal");
    expect(bannerSource).toContain("membership-floating-banner-shell");
    expect(bannerSource).toContain('if (!mounted || phase === "idle") return null');
  });

  it("uses 3D dog beside banner with SVG fallback path", () => {
    expect(bannerSource).toContain("Membership3DDog");
    expect(bannerSource).toContain("membership-floating-dog-3d-slot");
  });
});
