"use client";

import { CaptionImagePlaceholder } from "@/components/ui/CaptionImagePlaceholder";
import { IMAGE_ALT, IMAGES } from "@/lib/images";
import { useCallback, useState } from "react";

const IMAGE_CANDIDATES = [
  IMAGES.onboarding.petCare,
  IMAGES.onboarding.petCareFallback,
  IMAGES.onboarding.petCareFallbackAlt,
] as const;

const ILLUSTRATION_ALT = IMAGE_ALT.howItWorks.petParents;

const PANEL_CLASS =
  "relative min-h-[200px] w-full overflow-hidden rounded-2xl border border-[#DDEEDF] bg-[#F8F6F1] shadow-[0_12px_40px_rgba(46,107,63,0.08)] sm:min-h-[220px] lg:absolute lg:inset-0 lg:min-h-0 lg:rounded-none lg:rounded-r-3xl lg:border-l lg:border-y-0 lg:border-r-0";

export function RoleOnboardingIllustration() {
  const [srcIndex, setSrcIndex] = useState(0);
  const [usePlaceholder, setUsePlaceholder] = useState(false);
  const src = IMAGE_CANDIDATES[srcIndex] ?? IMAGE_CANDIDATES[0];

  const handleError = useCallback(() => {
    setSrcIndex((i) => {
      if (i < IMAGE_CANDIDATES.length - 1) return i + 1;
      setUsePlaceholder(true);
      return i;
    });
  }, []);

  return (
    <div className={PANEL_CLASS} aria-hidden>
      {usePlaceholder ? (
        <CaptionImagePlaceholder
          seed="onboarding-role"
          label={ILLUSTRATION_ALT}
          caption={ILLUSTRATION_ALT}
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- multi-src fallback chain
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={handleError}
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#2E6B3F]/10 via-transparent to-transparent lg:bg-gradient-to-l lg:from-[#2E6B3F]/15"
        aria-hidden
      />
    </div>
  );
}
