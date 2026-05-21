import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import type { PublicProfileView } from "@/lib/public-profile";

type PublicApproximateMapCardProps = {
  profile: PublicProfileView;
};

export function PublicApproximateMapCard({ profile }: PublicApproximateMapCardProps) {
  const map = profile.approximateMap;
  const label = profile.nearbyLocation;

  if (!map && !label) return null;

  const delta = 0.04;
  const bbox = map
    ? `${map.lng - delta},${map.lat - delta},${map.lng + delta},${map.lat + delta}`
    : null;
  const embedSrc = map
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox!)}&layer=mapnik&marker=${map.lat}%2C${map.lng}`
    : null;

  return (
    <section className={`${PUBLIC_CARD} overflow-hidden p-0`}>
      <div className="p-4 sm:p-5">
        <h2 className={PUBLIC_SECTION_TITLE}>Nearby area</h2>
        <p className="mt-0.5 text-xs text-muted">Approximate area only</p>
        {label ? <p className="mt-1.5 text-sm font-medium text-foreground">{label}</p> : null}
      </div>

      {embedSrc ? (
        <div className="relative h-36 w-full border-t border-black/5 bg-mint/10 sm:h-40">
          <iframe
            title={`Approximate map near ${label ?? profile.display_name}`}
            src={embedSrc}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center border-t border-black/5 bg-gradient-to-br from-mint/30 to-lavender/20">
          <div className="text-center">
            <MapPinIcon />
            <p className="mt-2 text-sm text-muted">{label ?? "General area"}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function MapPinIcon() {
  return (
    <svg
      className="mx-auto h-10 w-10 text-brand-teal"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
    </svg>
  );
}
