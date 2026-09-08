"use client";

import { CARE_LOCATION_QUERY_KEY, parseCareLocationQuery } from "@/lib/care-location-preference";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

type CareLocationParamsSyncProps = {
  onCareLocation: (value: string) => void;
};

/** Applies ?careLocation= from the URL once. Invalid values are ignored. */
export function CareLocationParamsSync({ onCareLocation }: CareLocationParamsSyncProps) {
  const searchParams = useSearchParams();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) return;
    const parsed = parseCareLocationQuery(searchParams.get(CARE_LOCATION_QUERY_KEY));
    appliedRef.current = true;
    if (!parsed) return;
    onCareLocation(parsed);
  }, [searchParams, onCareLocation]);

  return null;
}
