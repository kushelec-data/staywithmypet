import { AppImage } from "@/components/ui/AppImage";
import { Button } from "@/components/ui/Button";
import { PAGE_CONTAINER, PAGE_SECTION_TIGHT } from "@/lib/layout";

export type CtaBannerVariant = "cream" | "teal";

export type CtaBannerProps = {
  heading: string;
  subtext: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  variant?: CtaBannerVariant;
  imageSrc?: string;
  imageAlt?: string;
  /** Wrap in page section + container (default true). Set false when nesting inside another layout. */
  withPageShell?: boolean;
  className?: string;
};

const panelVariants: Record<CtaBannerVariant, string> = {
  cream:
    "border border-black/5 bg-cream text-foreground shadow-md shadow-black/5 dark:border-border dark:shadow-black/20",
  teal: "border border-brand-teal/20 bg-brand-teal text-white shadow-lg shadow-brand-teal/25",
};

export function CtaBanner({
  heading,
  subtext,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  variant = "cream",
  imageSrc,
  imageAlt,
  withPageShell = true,
  className = "",
}: CtaBannerProps) {
  const isTeal = variant === "teal";
  const hasSecondary = Boolean(secondaryLabel?.trim() && secondaryHref);
  const hasImage = Boolean(imageSrc?.trim());

  const panel = (
    <div
      className={`relative overflow-hidden rounded-2xl px-5 py-8 sm:rounded-3xl sm:px-8 sm:py-10 lg:px-10 lg:py-12 ${panelVariants[variant]} ${className}`}
    >
      <div
        className={
          hasImage
            ? "relative flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10"
            : "relative mx-auto max-w-2xl text-center"
        }
      >
        <div className={hasImage ? "min-w-0 flex-1 text-center lg:text-left" : undefined}>
          <h2
            className={`font-heading text-xl font-semibold sm:text-2xl lg:text-3xl ${
              isTeal ? "text-white" : "text-foreground"
            }`}
          >
            {heading}
          </h2>
          <p
            className={`mt-3 text-sm leading-relaxed sm:mt-4 sm:text-base ${
              isTeal ? "text-white/90" : "text-muted"
            } ${hasImage ? "mx-auto max-w-xl lg:mx-0" : ""}`}
          >
            {subtext}
          </p>
          <div
            className={`mt-6 flex w-full flex-col gap-3 sm:mt-7 ${
              hasImage
                ? "mx-auto max-w-sm sm:max-w-none sm:flex-row sm:justify-center lg:mx-0 lg:justify-start"
                : "mx-auto max-w-sm sm:max-w-none sm:flex-row sm:justify-center"
            }`}
          >
            <Button
              href={primaryHref}
              size="lg"
              className={
                isTeal
                  ? "bg-white text-brand-teal hover:bg-white/95 hover:text-brand-teal-hover"
                  : undefined
              }
            >
              {primaryLabel}
            </Button>
            {hasSecondary ? (
              <Button
                href={secondaryHref!}
                size="lg"
                variant={isTeal ? "outline" : "secondary"}
                className={
                  isTeal
                    ? "border-2 border-white/70 bg-transparent text-white hover:border-white hover:bg-white/15"
                    : "border border-black/10 bg-surface text-brand-teal hover:border-brand-teal/30 hover:bg-surface dark:border-border"
                }
              >
                {secondaryLabel}
              </Button>
            ) : null}
          </div>
        </div>

        {hasImage ? (
          <div className="relative mx-auto h-36 w-36 shrink-0 overflow-hidden rounded-2xl border border-black/5 shadow-md sm:h-40 sm:w-40 lg:mx-0 lg:h-44 lg:w-44 dark:border-border">
            <AppImage
              src={imageSrc!}
              alt={imageAlt ?? ""}
              seed={heading}
              captionOnlyFallback
              sizes="(max-width: 1024px) 160px, 176px"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </div>
  );

  if (!withPageShell) {
    return panel;
  }

  return (
    <section className={PAGE_SECTION_TIGHT}>
      <div className={PAGE_CONTAINER}>{panel}</div>
    </section>
  );
}
