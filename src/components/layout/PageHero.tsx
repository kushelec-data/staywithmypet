import { PAGE_CONTAINER } from "@/lib/layout";

type PageHeroProps = {
  badge?: string;
  title: string;
  description?: string;
  /** Mint gradient for search/care flows; mesh for editorial pages */
  variant?: "default" | "mint";
  /** Reduced vertical padding for compact editorial pages */
  compact?: boolean;
  children?: React.ReactNode;
};

export function PageHero({
  badge,
  title,
  description,
  variant = "default",
  compact = false,
  children,
}: PageHeroProps) {
  const bg =
    variant === "mint"
      ? "border-b border-black/5 bg-gradient-to-b from-mint/35 via-mint/15 to-background"
      : "border-b border-black/5 bg-mesh";

  const pad = compact ? "py-5 sm:py-8 lg:py-10" : "py-6 sm:py-12 lg:py-14";

  return (
    <header className={`${bg} min-w-0 overflow-hidden`}>
      <div className={`${PAGE_CONTAINER} min-w-0 ${pad}`}>
        {badge ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal sm:text-sm sm:tracking-[0.2em]">
            {badge}
          </p>
        ) : null}
        <h1
          className={`font-heading break-words text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl ${
            badge ? "mt-3 sm:mt-4" : ""
          }`}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:mt-5 sm:text-lg">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-6 sm:mt-8">{children}</div> : null}
      </div>
    </header>
  );
}
