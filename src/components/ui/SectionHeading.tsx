type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className = "",
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "mx-auto text-center" : "";

  return (
    <div className={`max-w-2xl ${alignClass} ${className}`}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal sm:text-sm sm:tracking-[0.2em]">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-tight ${
          eyebrow ? "mt-3 sm:mt-4" : ""
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-4 max-w-xl text-base leading-relaxed text-muted sm:mt-5 sm:text-lg ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
