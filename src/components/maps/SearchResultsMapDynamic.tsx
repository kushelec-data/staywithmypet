"use client";

import dynamic from "next/dynamic";
import type { SearchMapMarker } from "@/lib/search-map-markers";

const SearchResultsMap = dynamic(
  () => import("@/components/maps/SearchResultsMap").then((m) => m.SearchResultsMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[320px] h-[50vh] items-center justify-center rounded-3xl border border-black/[0.06] bg-mint/20 text-sm text-muted lg:h-[calc(100vh-160px)] lg:min-h-[520px]"
        aria-busy="true"
      >
        Loading map…
      </div>
    ),
  },
);

type SearchResultsMapDynamicProps = {
  markers: SearchMapMarker[];
  className?: string;
  mapHeightClass?: string;
  selectedId?: string | null;
  onMarkerSelect?: (id: string) => void;
  ariaLabel?: string;
  /** Forces a full remount when the search view or mode changes (avoids stale Leaflet instances). */
  mountKey?: string;
};

export function SearchResultsMapDynamic({
  mountKey = "map",
  ...props
}: SearchResultsMapDynamicProps) {
  return <SearchResultsMap key={mountKey} {...props} />;
}
