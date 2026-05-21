import { CtaBanner } from "@/components/ui/CtaBanner";

type PageCtaProps = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  variant?: "cream" | "teal";
  imageSrc?: string;
  imageAlt?: string;
};

/** Marketing page bottom CTA — uses accessible cream/teal panels (no pale gradients). */
export function PageCta({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  variant = "cream",
  imageSrc,
  imageAlt,
}: PageCtaProps) {
  return (
    <CtaBanner
      heading={title}
      subtext={description}
      primaryLabel={primaryLabel}
      primaryHref={primaryHref}
      secondaryLabel={secondaryLabel}
      secondaryHref={secondaryHref}
      variant={variant}
      imageSrc={imageSrc}
      imageAlt={imageAlt}
    />
  );
}
