import { AppImage } from "@/components/ui/AppImage";
import { PUBLIC_CARD_MINT } from "@/lib/public-layout";

type FounderCardProps = {
  name: string;
  role: string;
  bio: string;
  image: string;
  coFounderLabel?: string;
};

export function FounderCard({ name, role, bio, image, coFounderLabel }: FounderCardProps) {
  return (
    <article className={PUBLIC_CARD_MINT}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="relative mx-auto h-[220px] w-full max-w-[220px] shrink-0 overflow-hidden rounded-2xl bg-cream shadow-sm ring-2 ring-white/80 sm:mx-0 sm:w-[200px]">
          <div className="relative h-full w-full">
            <AppImage
              src={image}
              alt={name}
              seed={name}
              fallbackCaption={coFounderLabel ? `${name} · ${coFounderLabel}` : name}
              captionOnlyFallback
              sizes="220px"
              className="object-contain object-[center_top]"
            />
          </div>
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          {coFounderLabel ? (
            <span className="inline-flex rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-xs font-semibold text-brand-teal">
              {coFounderLabel}
            </span>
          ) : null}
          <h3
            className={`font-heading text-lg font-semibold text-foreground sm:text-xl ${
              coFounderLabel ? "mt-2" : ""
            }`}
          >
            {name}
          </h3>
          <p className="mt-1 text-sm font-semibold text-brand-teal">{role}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{bio}</p>
        </div>
      </div>
    </article>
  );
}
