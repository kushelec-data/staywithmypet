import { AppImage } from "@/components/ui/AppImage";
import { PUBLIC_CARD_MINT } from "@/lib/public-layout";

type FounderCardProps = {
  name: string;
  role: string;
  bio: string;
  image: string;
  badge?: string;
};

export function FounderCard({ name, role, bio, image, badge }: FounderCardProps) {
  return (
    <article className={`${PUBLIC_CARD_MINT} flex h-full min-w-0 flex-col`}>
      <div className="relative mx-auto aspect-square w-full max-w-[200px] shrink-0 overflow-hidden rounded-2xl bg-cream shadow-sm ring-2 ring-white/80">
        <AppImage
          src={image}
          alt={name}
          seed={name}
          fallbackCaption={badge ? `${name} · ${badge}` : name}
          captionOnlyFallback
          sizes="200px"
          className="object-cover object-[center_18%]"
        />
      </div>
      <div className="mt-4 flex min-w-0 flex-1 flex-col text-center">
        {badge ? (
          <span className="mx-auto inline-flex rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-xs font-semibold text-brand-teal">
            {badge}
          </span>
        ) : null}
        <h3
          className={`font-heading text-balance text-lg font-semibold text-foreground sm:text-xl ${
            badge ? "mt-2" : ""
          }`}
        >
          {name}
        </h3>
        {role ? <p className="mt-1 text-sm font-semibold text-brand-teal">{role}</p> : null}
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{bio}</p>
      </div>
    </article>
  );
}
