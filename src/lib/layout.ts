/** Shared layout tokens — responsive spacing and max-widths site-wide. */

/** Prevents horizontal scroll from decorative elements */
export const PAGE_OVERFLOW_SAFE = "overflow-x-hidden";

/** Full-width page shell: mobile → xl padding scale */
export const PAGE_CONTAINER =
  "mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8 xl:px-12";

/** Centered content column (~75% feel on large screens) */
export const CONTENT_CONTAINER =
  "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 xl:px-12";

export const PAGE_SECTION = "section-pad";

export const PAGE_SECTION_TIGHT = "section-pad-tight";

/** Responsive heading scale (use on h1 / hero titles) */
export const HEADING_HERO =
  "font-heading text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl";

/** Responsive section h2 via SectionHeading — documented for consistency */
