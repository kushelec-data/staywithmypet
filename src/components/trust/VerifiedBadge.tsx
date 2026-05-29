import { useLanguage } from "@/context/LanguageContext";
import { DASHBOARD_STATUS_BADGE_CLASS } from "@/lib/dashboard-theme";

type VerifiedBadgeProps = {
  className?: string;
  tone?: "default" | "dashboard";
};

export function VerifiedBadge({ className = "", tone = "default" }: VerifiedBadgeProps) {
  const { t } = useLanguage();

  const toneClass =
    tone === "dashboard"
      ? DASHBOARD_STATUS_BADGE_CLASS
      : "inline-flex items-center gap-1 rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-xs font-semibold text-brand-teal";

  return (
    <span
      className={`${toneClass} ${className}`.trim()}
      title={t.trustSafety.verifiedHint}
    >
      <CheckIcon />
      {t.trustSafety.verifiedBadge}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
