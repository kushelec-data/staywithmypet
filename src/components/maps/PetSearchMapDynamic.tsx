"use client";

import dynamic from "next/dynamic";
import type { SearchMapMarker } from "@/lib/search-map-markers";

const PetSearchMap = dynamic(
  () => import("@/components/maps/PetSearchMap").then((m) => m.PetSearchMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[280px] items-center justify-center rounded-3xl border border-black/[0.06] bg-mint/20 text-sm text-muted sm:min-h-[360px] lg:min-h-[520px]"
        aria-busy="true"
      >
        Loading map…
      </div>
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
