"use client";

import { SearchResultsMap } from "@/components/maps/SearchResultsMap";
import type { SearchMapMarker } from "@/lib/search-map-markers";

export type { SearchMapMarker as PetMapMarker };

type PetSearchMapProps = {
  markers: SearchMapMarker[];
  className?: string;
  selectedId?: string | null;
  onMarkerSelect?: (id: string) => void;
};

/** @deprecated prefer SearchResultsMap — kept for existing imports. */
export function PetSearchMap({
  markers,
  className = "",
  selectedId,
  onMarkerSelect,
}: PetSearchMapProps) {
  return (
    <SearchResultsMap
      markers={markers}
      className={className}
      selectedId={selectedId}
      onMarkerSelect={onMarkerSelect}
      ariaLabel="Pet locations map"
    />
  );
}
