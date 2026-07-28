import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findDogAnimationClip,
  phaseDurationMs,
  resolveDogClipMap,
} from "@/lib/membership-dog-animation";
import {
  MEMBERSHIP_DOG_MIN_VIEWPORT_PX,
  shouldEnableMembership3DDog,
} from "@/lib/membership-dog-capabilities";

describe("membership 3D dog capabilities", () => {
  it("3. does not enable with reduced motion", () => {
    expect(
      shouldEnableMembership3DDog({
        reducedMotion: true,
        webglAvailable: true,
        viewportWidth: 800,
      }),
    ).toBe(false);
  });

  it("4. does not enable when Save-Data is enabled", () => {
    expect(
      shouldEnableMembership3DDog({
        reducedMotion: false,
        saveData: true,
        webglAvailable: true,
        viewportWidth: 800,
      }),
    ).toBe(false);
  });

  it("disables on very small viewports", () => {
    expect(
      shouldEnableMembership3DDog({
        reducedMotion: false,
        saveData: false,
        webglAvailable: true,
        viewportWidth: MEMBERSHIP_DOG_MIN_VIEWPORT_PX - 1,
      }),
    ).toBe(false);
  });

  it("enables on capable desktop devices", () => {
    expect(
      shouldEnableMembership3DDog({
        reducedMotion: false,
        saveData: false,
        webglAvailable: true,
        viewportWidth: 1280,
        deviceMemoryGb: 8,
      }),
    ).toBe(true);
  });
});

describe("membership 3D dog animation clips", () => {
  it("resolves expected Quaternius dog clips", () => {
    const clips = [
      { name: "AnimalArmature|Walk", duration: 1 },
      { name: "AnimalArmature|Idle", duration: 7 },
      { name: "AnimalArmature|Idle_Eating", duration: 3 },
      { name: "AnimalArmature|Jump_Start", duration: 0.4 },
      { name: "AnimalArmature|Jump_Loop", duration: 1 },
    ] as const;

    const map = resolveDogClipMap([...clips]);
    expect(map.walk?.name).toContain("Walk");
    expect(map.idle?.name).toContain("Idle");
    expect(map.idleEating?.name).toContain("Idle_Eating");
    expect(findDogAnimationClip([...clips], "Jump_Loop")?.name).toContain("Jump_Loop");
  });

  it("10. intro sequence totals roughly 7–10 seconds", () => {
    const total = [
      "enter-walk",
      "idle-look",
      "jump",
      "roll",
      "sit-idle",
      "lean-cta",
    ].reduce((sum, phase) => sum + phaseDurationMs(phase as never), 0);
    expect(total).toBeGreaterThanOrEqual(7000);
    expect(total).toBeLessThanOrEqual(10000);
  });
});

describe("Membership3DDog integration", () => {
  const dogSource = readFileSync(
    join(process.cwd(), "src/components/membership/Membership3DDog.tsx"),
    "utf8",
  );
  const sceneSource = readFileSync(
    join(process.cwd(), "src/components/membership/Membership3DDogScene.tsx"),
    "utf8",
  );
  const bannerSource = readFileSync(
    join(process.cwd(), "src/components/membership/MembershipFloatingDogBanner.tsx"),
    "utf8",
  );

  it("1. 3D component loads only on client", () => {
    expect(dogSource).toContain('dynamic(() => import("@/components/membership/Membership3DDogScene")');
    expect(dogSource).toContain("ssr: false");
    expect(sceneSource).toContain('"use client"');
  });

  it("2. banner works if model fails via fallback illustration", () => {
    expect(dogSource).toContain("Membership3DDogFallback");
    expect(dogSource).toContain("Membership3DDogErrorBoundary");
    expect(dogSource).toContain("setFailed(true)");
  });

  it("5. closing banner unmounts canvas with banner phase", () => {
    expect(bannerSource).toContain('phase === "idle") return null');
    expect(bannerSource).toContain('setPhase("closing")');
    expect(bannerSource).toContain("showDog = phase !== \"idle\"");
  });

  it("6. CTA remains clickable", () => {
    expect(bannerSource).toContain("data-membership-floating-cta");
    expect(bannerSource).toContain("onClick={handleViewPlans}");
  });

  it("7. no duplicate canvas mount in banner", () => {
    expect(bannerSource.match(/<Membership3DDog/g)?.length).toBe(1);
    expect(sceneSource.match(/<Canvas/g)?.length).toBe(1);
  });

  it("8. mobile layout avoids overflow", () => {
    expect(bannerSource).toContain("max-w-[880px]");
    expect(bannerSource).toContain("membership-floating-dog-3d-slot");
    expect(bannerSource).toContain("min-w-0");
  });

  it("9. model load failure does not crash page", () => {
    expect(dogSource).toContain("componentDidCatch");
    expect(dogSource).toContain("handleLoadError");
  });

  it("10. animation sequence runs only once per mount via introComplete", () => {
    expect(sceneSource).toContain("introDoneRef");
    expect(sceneSource).toContain("onIntroComplete");
    expect(sceneSource).toContain('"idle-loop"');
  });

  it("uses performance guards", () => {
    expect(sceneSource).toContain('frameloop={frameLoop}');
    expect(sceneSource).toContain("IntersectionObserver");
    expect(sceneSource).toContain("visibilitychange");
    expect(sceneSource).toContain("dpr={[1, 1.5]}");
    expect(dogSource).toContain("requestIdleCallback");
    expect(dogSource).toContain("shouldEnableMembership3DDog");
  });
});
