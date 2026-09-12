export function QuizQuestionImage({
  src,
  alt,
  compact = false,
}: {
  src?: string | null;
  alt: string;
  compact?: boolean;
}) {
  if (!src) return null;
  return (
    <div className={`mx-auto flex w-full items-center justify-center ${compact ? "max-h-28 max-w-[12rem] md:max-h-32" : "max-h-[22vh] max-w-[16rem] md:max-h-[26vh] md:max-w-[18rem]"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="max-h-full w-auto max-w-full rounded-2xl object-contain"
      />
    </div>
  );
}
