"use client";

import { parseCareTypesQuery, CARE_TYPES_QUERY_KEY } from "@/lib/care-search-params";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

type CareSearchParamsSyncProps = {
  enabled: boolean;
  onCareTypes: (types: string[]) => void;
};

/** Applies ?careTypes= from the URL once when opening /find-care. */
export function CareSearchParamsSync({ enabled, onCareTypes }: CareSearchParamsSyncProps) {
  const searchParams = useSearchParams();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!enabled || appliedRef.current) return;
    const types = parseCareTypesQuery(searchParams.get(CARE_TYPES_QUERY_KEY));
    if (!types.length) return;
    appliedRef.current = true;
    onCareTypes(types);
  }, [enabled, searchParams, onCareTypes]);

  return null;
}
