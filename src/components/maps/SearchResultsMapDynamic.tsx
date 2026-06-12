"use client";

import { MapLoadingFallback } from "@/components/i18n/SuspenseFallbacks";
import dynamic from "next/dynamic";
import type { SearchMapMarker } from "@/lib/search-map-markers";

const SearchResultsMap = dynamic(
  () => import("@/components/maps/SearchResultsMap").then((m) => m.SearchResultsMap),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
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
