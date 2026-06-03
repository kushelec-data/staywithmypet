"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { PublicTrustBadgeId } from "@/lib/public-profile";

const HERO_BADGE_ORDER: PublicTrustBadgeId[] = ["email_verified", "profile_complete"];

type ProfileVerificationBadgesProps = {
  trustBadges: PublicTrustBadgeId[];
  className?: string;
};

export function ProfileVerificationBadges({
  trustBadges,
  className = "",
}: ProfileVerificationBadgesProps) {
  const { t } = useLanguage();
  const ts = t.trustSafety;
  const visible = HERO_BADGE_ORDER.filter((id) => trustBadges.includes(id));

  if (!visible.length) return null;

  const label = (id: PublicTrustBadgeId): string => {
    switch (id) {
      case "email_verified":
        return ts.trustBadgeEmail;
      case "profile_complete":
        return ts.trustBadgeProfile;
      default:
        return id;
    }
  };

  return (
    <ul className={`flex min-w-0 flex-wrap gap-1.5 ${className}`}>
      {visible.map((id) => (
        <li
          key={id}
          className="rounded-full bg-mint/50 px-2 py-0.5 text-[0.65rem] font-semibold text-brand-teal ring-1 ring-brand-teal/15 sm:text-[0.7rem]"
        >
          {label(id)}
        </li>
      ))}
    </ul>
  );
}
