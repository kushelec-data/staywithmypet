"use client";

import { useLanguage } from "@/context/LanguageContext";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import type { PublicProfileView } from "@/lib/public-profile";

type PublicApproximateMapCardProps = {
  profile: PublicProfileView;
};

export function PublicApproximateMapCard({ profile }: PublicApproximateMapCardProps) {
  const { t } = useLanguage();
  const ui = t.publicProfileUi;
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
  const mapTitle = ui.approximateMapNear.replace("{location}", label ?? profile.display_name);

  return (
    <section className={`${PUBLIC_CARD} overflow-hidden p-0`}>
      <div className="p-4 sm:p-5">
        <h2 className={PUBLIC_SECTION_TITLE}>{ui.nearbyArea}</h2>
        <p className="mt-0.5 text-xs text-muted">{ui.approximateAreaOnly}</p>
        {label ? <p className="mt-1.5 text-sm font-medium text-foreground">{label}</p> : null}
      </div>

      {embedSrc ? (
        <div className="relative h-36 w-full border-t border-black/5 bg-mint/10 sm:h-40">
          <iframe
            title={mapTitle}
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
            <p className="mt-2 text-sm text-muted">{label ?? ui.generalArea}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function MapPinIcon() {
  return (
    <svg
      className="mx-auto h-8 w-8 text-brand-teal/60"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
