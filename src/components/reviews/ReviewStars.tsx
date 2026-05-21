type ReviewStarsProps = {
  rating: number;
  size?: "sm" | "md";
};

export function ReviewStars({ rating, size = "sm" }: ReviewStarsProps) {
  const starClass = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const rounded = Math.round(rating * 2) / 2;

  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={starClass} viewBox="0 0 24 24" fill={i <= rounded ? "currentColor" : "none"}>
          <path
            d="M12 2l2.9 6.26 6.8.58-5.15 4.46 1.55 6.64L12 17.77l-6.1 3.17 1.55-6.64-5.15-4.46 6.8-.58L12 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            className={i <= rounded ? "" : "text-muted/40"}
          />
        </svg>
      ))}
    </span>
  );
}
