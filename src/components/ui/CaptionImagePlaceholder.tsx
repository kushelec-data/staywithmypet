import { placeholderGradient } from "@/lib/placeholders";

type CaptionImagePlaceholderProps = {
  className?: string;
  label?: string;
  caption: string;
  seed?: string;
};

/** Gradient placeholder with caption only — no emoji (editorial / about imagery). */
export function CaptionImagePlaceholder({
  className = "",
  label,
  caption,
  seed = "default",
}: CaptionImagePlaceholderProps) {
  const gradient = placeholderGradient(seed);

  return (
    <div
      className={`flex items-center justify-center rounded-3xl bg-gradient-to-br ${gradient} ${className}`}
      role="img"
      aria-label={label ?? caption}
    >
      <p className="font-heading max-w-[18rem] px-5 text-center text-sm font-semibold leading-snug text-foreground/85 sm:text-base">
        {caption}
      </p>
    </div>
  );
}
