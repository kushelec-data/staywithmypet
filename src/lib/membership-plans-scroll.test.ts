import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  MEMBERSHIP_PLANS_SECTION_ID,
  membershipActivateFallbackHref,
  scrollToMembershipPlans,
} from "@/lib/membership-plans-scroll";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("membershipActivateFallbackHref", () => {
  it("preserves Pet Friend role and returnTo in fallback navigation", () => {
    expect(
      membershipActivateFallbackHref("pet_friend", "/find-pets/abc?x=1"),
    ).toBe("/membership?role=friend&returnTo=%2Ffind-pets%2Fabc%3Fx%3D1");
  });

  it("rejects external returnTo paths", () => {
    expect(membershipActivateFallbackHref("pet_friend", "https://evil.test")).toBe(
      "/membership?role=friend",
    );
  });
});

describe("scrollToMembershipPlans", () => {
  it("scrolls to plans section and focuses the first purchasable plan button", () => {
    const focusMock = vi.fn();
    const scrollIntoViewMock = vi.fn();
    const focusButton = {
      setAttribute: vi.fn(),
      focus: focusMock,
    } as unknown as HTMLElement;

    const section = {
      id: MEMBERSHIP_PLANS_SECTION_ID,
      scrollIntoView: scrollIntoViewMock,
      querySelector: vi.fn((selector: string) => {
        if (selector.includes("data-membership-plan-focus")) return focusButton;
        return null;
      }),
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    } as unknown as HTMLElement;

    vi.stubGlobal("document", {
      getElementById: vi.fn(() => section),
    });
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: false })),
      setTimeout: (fn: () => void) => {
        fn();
        return 1;
      },
    });

    expect(scrollToMembershipPlans()).toBe(true);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(focusMock).toHaveBeenCalledWith({ preventScroll: true });

    vi.unstubAllGlobals();
  });

  it("navigates to membership fallback when plans section is missing", () => {
    vi.stubGlobal("document", {
      getElementById: vi.fn(() => null),
    });
    const navigate = vi.fn();

    expect(
      scrollToMembershipPlans({
        role: "pet_friend",
        returnTo: "/find-pets/abc",
        navigate,
      }),
    ).toBe(true);
    expect(navigate).toHaveBeenCalledWith(
      "/membership?role=friend&returnTo=%2Ffind-pets%2Fabc",
    );

    vi.unstubAllGlobals();
  });
});

describe("MembershipWelcomeOfferHero activate membership", () => {
  const heroSource = readSource("src/components/membership/MembershipWelcomeOfferHero.tsx");
  const pageSource = readSource("src/components/membership/MembershipPageContent.tsx");
  const plansSource = readSource("src/components/pricing/MembershipPlans.tsx");

  it("uses a semantic button with scroll handler instead of same-page Link href", () => {
    expect(heroSource).toContain("scrollToMembershipPlans");
    expect(heroSource).toContain('type="button"');
    expect(heroSource).toContain("onClick={handleActivate}");
    expect(heroSource).not.toContain("newMemberPromotionMembershipHref");
  });

  it("is keyboard accessible with visible focus styles on actions", () => {
    expect(heroSource).toContain("focus-visible:outline");
    expect(heroSource).toContain('type="button"');
  });

  it("wires account membership page to hero and plans anchor", () => {
    expect(pageSource).toContain("MembershipWelcomeOfferHero");
    expect(pageSource).toContain("MEMBERSHIP_PLANS_SECTION_ID");
    expect(pageSource).not.toContain('variant="strip"');
    expect(plansSource).toContain('data-membership-plan-focus');
    expect(plansSource).toContain("sectionId");
  });
});
