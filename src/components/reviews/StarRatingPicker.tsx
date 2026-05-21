"use client";

type StarRatingPickerProps = {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  label: string;
};

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} aria-hidden>
      <path
        d="M12 2l2.9 6.26 6.8.58-5.15 4.46 1.55 6.64L12 17.77l-6.1 3.17 1.55-6.64-5.15-4.46 6.8-.58L12 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className={filled ? "text-amber-500" : "text-muted/40"}
      />
    </svg>
  );
}

export function StarRatingPicker({ value, onChange, disabled, label }: StarRatingPickerProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={value === star}
            className="rounded-lg p-0.5 transition-transform hover:scale-105 disabled:opacity-50"
            onClick={() => onChange(star)}
          >
            <StarIcon filled={star <= value} />
          </button>
        ))}
      </div>
    </div>
  );
}
