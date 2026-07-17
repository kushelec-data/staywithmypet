"use client";

import { parseSearchLocationQuery, SEARCH_LOCATION_QUERY_KEY } from "@/lib/search-location-params";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

type SearchLocationParamsSyncProps = {
  onLocation: (location: string) => void;
};

/** Applies ?location= from the URL once when opening a search page. */
export function SearchLocationParamsSync({ onLocation }: SearchLocationParamsSyncProps) {
  const searchParams = useSearchParams();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) return;
    const location = parseSearchLocationQuery(searchParams.get(SEARCH_LOCATION_QUERY_KEY));
    if (!location) return;
    appliedRef.current = true;
    onLocation(location);
  }, [searchParams, onLocation]);

  return null;
}
