import { placeholderGradient } from "@/lib/placeholders";

type PawPlaceholderProps = {
  className?: string;
  label?: string;
  caption?: string;
  seed?: string;
  emoji?: string;
};

export function PawPlaceholder({
  className = "",
  label = "Pet sharing illustration",
  caption = "Pet sharing built on trust",
  seed = "default",
  emoji = "🐾",
}: PawPlaceholderProps) {
  const gradient = placeholderGradient(seed);

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br ${gradient} ${className}`}
      role="img"
      aria-label={label}
    >
      <span className="text-4xl drop-shadow-sm sm:text-5xl" aria-hidden>
        {emoji}
      </span>
      {caption ? (
        <p className="font-heading mt-3 max-w-[16rem] px-4 text-center text-sm font-semibold leading-snug text-foreground/85 sm:text-base">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
