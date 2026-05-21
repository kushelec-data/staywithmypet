"use client";

import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { getGoogleMapsApiKey, loadGoogleMapsPlacesScript } from "@/lib/google-places-loader";

export type PlaceResolvedPayload = {
  location: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

type LocationAutocompleteFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
  onPlaceResolved?: (place: PlaceResolvedPayload) => void;
  /** Shown when Google key is missing */
  datalistId?: string;
};

export function LocationAutocompleteField({
  value,
  onChange,
  onPlaceResolved,
  datalistId,
  id,
  onKeyDown,
  onFocus,
  onBlur,
  ...rest
}: LocationAutocompleteFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<unknown>(null);
  const onPlaceResolvedRef = useRef(onPlaceResolved);
  const onChangeRef = useRef(onChange);
  const focusedRef = useRef(false);
  const [draft, setDraft] = useState(value);
  onPlaceResolvedRef.current = onPlaceResolved;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(value);
    }
  }, [value]);

  const autoId = useId();
  const inputId = id ?? `loc-${autoId}`;
  const apiKey = getGoogleMapsApiKey();

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    let cancelled = false;
    const input = inputRef.current;

    loadGoogleMapsPlacesScript(apiKey)
      .then(() => {
        if (cancelled || !window.google?.maps?.places) return;
        const Autocomplete = window.google.maps.places.Autocomplete;
        const ac = new Autocomplete(input, {
          fields: ["formatted_address", "geometry", "name"],
          types: ["geocode"],
        });

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const formatted = place.formatted_address;
          const name = place.name;
          const loc = place.geometry?.location;
          const lat = loc ? loc.lat() : null;
          const lng = loc ? loc.lng() : null;
          const locationText = formatted || name || "";
          if (!locationText.trim()) return;
          setDraft(locationText);
          onChangeRef.current(locationText);
          onPlaceResolvedRef.current?.({
            location: locationText,
            address: formatted ?? name ?? null,
            latitude: lat,
            longitude: lng,
          });
        });

        acRef.current = ac;
      })
      .catch(() => {
        /* manual entry still works */
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

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
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
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        onChange(next);
      }}
      onKeyDown={handleKeyDown}
      onFocus={(e) => {
        focusedRef.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        onBlur?.(e);
      }}
      list={datalistId}
      autoComplete={apiKey ? "off" : rest.autoComplete}
    />
  );
}
