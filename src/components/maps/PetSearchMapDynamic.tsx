"use client";

import { MapLoadingFallback } from "@/components/i18n/SuspenseFallbacks";
import dynamic from "next/dynamic";
import type { SearchMapMarker } from "@/lib/search-map-markers";

const PetSearchMap = dynamic(
  () => import("@/components/maps/PetSearchMap").then((m) => m.PetSearchMap),
  {
    ssr: false,
    loading: () => (
      <MapLoadingFallback className="flex min-h-[280px] items-center justify-center rounded-3xl border border-black/[0.06] bg-mint/20 text-sm text-muted sm:min-h-[360px] lg:min-h-[520px]" />
    ),
  },
);

type PetSearchMapDynamicProps = {
  markers: SearchMapMarker[];
  className?: string;
  selectedId?: string | null;
  onMarkerSelect?: (id: string) => void;
};

export function PetSearchMapDynamic(props: PetSearchMapDynamicProps) {
  return <PetSearchMap {...props} />;
}
