"use client";

import { getGoogleMapsApiKey, loadGoogleMapsPlacesScript } from "@/lib/google-places-loader";
import {
  isPlaceSelectionComplete,
  parseGooglePlaceSelection,
  type GooglePlaceSelectPayload,
} from "@/lib/google-places-parse";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";

export type { GooglePlaceSelectPayload };

type GooglePlacesInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: GooglePlaceSelectPayload) => void;
  /** When true (Google API available), free-text entry without a suggestion is cleared on blur. */
  forceGoogleSelection?: boolean;
  /** Estonian city datalist when Google is unavailable */
  datalistId?: string;
};

const PLACE_FIELDS = [
  "formatted_address",
  "geometry",
  "address_components",
  "place_id",
  "name",
] as const;

type PlaceResult = ReturnType<google.maps.places.Autocomplete["getPlace"]>;

function fetchPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  return new Promise((resolve) => {
    const g = window.google;
    if (!g?.maps?.places) {
      resolve(null);
      return;
    }

    const host = document.createElement("div");
    const service = new g.maps.places.PlacesService(host);
    service.getDetails({ placeId, fields: [...PLACE_FIELDS] }, (result, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && result) {
        resolve(result);
      } else {
        resolve(null);
      }
    });
  });
}

async function resolvePlaceFromAutocomplete(raw: PlaceResult): Promise<GooglePlaceSelectPayload | null> {
  let place: PlaceResult = raw;
  if (!isPlaceSelectionComplete(place) && place.place_id) {
    const detailed = await fetchPlaceDetails(place.place_id);
    if (detailed) place = detailed;
  }
  return parseGooglePlaceSelection(place);
}

export function GooglePlacesInput({
  value,
  onChange,
  onPlaceSelect,
  datalistId,
  forceGoogleSelection = false,
  id,
  onKeyDown,
  onFocus,
  onBlur,
  ...rest
}: GooglePlacesInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const onChangeRef = useRef(onChange);
  const focusedRef = useRef(false);
  const confirmedRef = useRef(false);
  const [draft, setDraft] = useState(value);

  onPlaceSelectRef.current = onPlaceSelect;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(value);
      confirmedRef.current = Boolean(value.trim());
    }
  }, [value]);

  const autoId = useId();
  const inputId = id ?? `gplaces-${autoId}`;
  const apiKey = getGoogleMapsApiKey();
  const useGoogle = Boolean(apiKey);

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    let cancelled = false;
    const input = inputRef.current;

    loadGoogleMapsPlacesScript(apiKey)
      .then(() => {
        if (cancelled || !window.google?.maps?.places) return;

        const ac = new google.maps.places.Autocomplete(input, {
          fields: [...PLACE_FIELDS],
          types: ["geocode"],
        });

        ac.addListener("place_changed", () => {
          void (async () => {
            const parsed = await resolvePlaceFromAutocomplete(ac.getPlace());
            if (!parsed || cancelled) return;
            confirmedRef.current = true;
            setDraft(parsed.formatted_address);
            onChangeRef.current(parsed.formatted_address);
            onPlaceSelectRef.current(parsed);
          })();
        });

        acRef.current = ac;
      })
      .catch(() => {
        /* manual entry + datalist still work */
      });

    return () => {
      cancelled = true;
      const ac = acRef.current;
      acRef.current = null;
      if (ac && window.google?.maps?.event?.clearInstanceListeners) {
        window.google.maps.event.clearInstanceListeners(ac);
      }
    };
  }, [apiKey]);

  function handleChange(next: string) {
    confirmedRef.current = false;
    setDraft(next);
    onChange(next);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    // Never block Space — Google Autocomplete and address entry need it.
    if (e.key === " " || e.code === "Space") {
      return;
    }
  }

  return (
    <input
      {...rest}
      ref={inputRef}
      id={inputId}
      value={draft}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={(e) => {
        focusedRef.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        if (forceGoogleSelection && useGoogle && !confirmedRef.current) {
          setDraft(value);
          onChangeRef.current(value);
        }
        onBlur?.(e);
      }}
      list={useGoogle ? undefined : datalistId}
      autoComplete={useGoogle ? "off" : rest.autoComplete}
    />
  );
}
