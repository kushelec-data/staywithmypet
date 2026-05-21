type PetPlaceholderProps = {
  color: string;
  emoji: string;
  name?: string;
  className?: string;
  aspect?: "square" | "wide" | "hero";
};

const aspectClasses = {
  square: "aspect-square",
  wide: "aspect-[4/3]",
  hero: "aspect-[16/9] min-h-[200px]",
};

export function PetPlaceholder({
  color,
  emoji,
  name,
  className = "",
  aspect = "wide",
}: PetPlaceholderProps) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl ${aspectClasses[aspect]} ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden={!name}
      role={name ? "img" : undefined}
      aria-label={name ? `${name} photo placeholder` : undefined}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, white 0%, transparent 50%)",
        }}
      />
      <span className="relative text-5xl drop-shadow-sm sm:text-6xl">{emoji}</span>
    </div>
  );
}