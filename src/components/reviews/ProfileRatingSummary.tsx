"use client";

import { useLanguage } from "@/context/LanguageContext";

const REVIEWS_SECTION_ID = "reviews";

type ProfileRatingSummaryProps = {
  ratingAvg: number;
  reviewCount: number;
  className?: string;
  /** Scroll to the on-page reviews section */
  scrollToSection?: boolean;
  /** Open reviews in a modal (dashboard) */
  onOpenModal?: () => void;
};

export function ProfileRatingSummary({
  ratingAvg,
  reviewCount,
  className = "",
  scrollToSection = false,
  onOpenModal,
}: ProfileRatingSummaryProps) {
  const { t } = useLanguage();
  const r = t.reviews;

  if (reviewCount <= 0) return null;

  const label = `★ ${ratingAvg.toFixed(1)} · ${reviewCount} ${
    reviewCount === 1 ? r.reviewSingular : r.reviewPlural
  }`;

  const interactive = scrollToSection || onOpenModal;

  function handleClick() {
    if (onOpenModal) {
      onOpenModal();
      return;
    }
    if (scrollToSection) {
      document.getElementById(REVIEWS_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (!interactive) {
    return <p className={`text-sm font-medium text-brand-teal ${className}`}>{label}</p>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`mt-0.5 text-left text-xs font-medium text-brand-teal underline decoration-brand-teal/40 underline-offset-2 transition-colors hover:text-brand-pink hover:decoration-brand-pink/40 sm:text-sm ${className}`}
      aria-label={r.viewReviews}
    >
      {label}
    </button>
  );
}

export { REVIEWS_SECTION_ID };
