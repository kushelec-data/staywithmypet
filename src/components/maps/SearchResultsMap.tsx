"use client";

import { fixLeafletDefaultIcons } from "@/components/maps/leaflet-icon-fix";
import { useLanguage } from "@/context/LanguageContext";
import type { SearchMapMarker } from "@/lib/search-map-markers";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

export type { SearchMapMarker };

const ESTONIA_CENTER: [number, number] = [58.75, 25.5];
const DEFAULT_ZOOM = 7;

const OSM_LIGHT = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const CARTO_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

function createBrandPinIcon(selected: boolean): L.DivIcon {
  const size = selected ? 36 : 28;
  const anchorY = selected ? 36 : 28;
  return L.divIcon({
    className: `swmp-map-pin${selected ? " swmp-map-pin--selected" : ""}`,
    html: `<span class="swmp-map-pin__dot" aria-hidden="true"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, anchorY],
    popupAnchor: [0, selected ? -32 : -26],
  });
}

function FitBounds({ markers }: { markers: SearchMapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 12);
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
  }, [map, markers]);
  return null;
}

function FlyToSelected({
  markers,
  selectedId,
}: {
  markers: SearchMapMarker[];
  selectedId?: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const marker = markers.find((m) => m.id === selectedId);
    if (!marker) return;
    const targetZoom = Math.max(map.getZoom(), 12);
    map.flyTo([marker.lat, marker.lng], targetZoom, { duration: 0.45 });
  }, [map, markers, selectedId]);
  return null;
}

function MapMarkerPopup({ marker }: { marker: SearchMapMarker }) {
  const { t } = useLanguage();
  const isFriend = marker.variant === "friends";
  const ctaLabel = isFriend ? t.common.viewProfile : t.requests.viewPet;

  return (
    <div className="swmp-map-popup__card">
      {marker.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={marker.photoUrl}
          alt=""
          className="swmp-map-popup__photo"
          width={72}
          height={72}
        />
      ) : (
        <div className="swmp-map-popup__photo swmp-map-popup__photo--placeholder" aria-hidden>
          {isFriend ? "👤" : "🐾"}
        </div>
      )}
      <div className="swmp-map-popup__body">
        <p className="swmp-map-popup__name">{marker.name}</p>
        {marker.locationArea ? (
          <p className="swmp-map-popup__area">{marker.locationArea}</p>
        ) : null}
        <Link href={marker.href} className="swmp-map-popup__cta">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

function SearchMapMarkerItem({
  marker,
  selected,
  dimmed,
  onMarkerSelect,
}: {
  marker: SearchMapMarker;
  selected: boolean;
  dimmed: boolean;
  onMarkerSelect?: (id: string) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const icon = useMemo(() => createBrandPinIcon(selected), [selected]);

  useEffect(() => {
    if (!selected) return;
    markerRef.current?.openPopup();
  }, [selected]);

  return (
    <Marker
      ref={markerRef}
      position={[marker.lat, marker.lng]}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      eventHandlers={{
        click: () => onMarkerSelect?.(marker.id),
      }}
      opacity={dimmed ? 0.65 : 1}
    >
      <Popup className="swmp-map-popup" closeButton>
        <MapMarkerPopup marker={marker} />
      </Popup>
    </Marker>
  );
}

type SearchResultsMapProps = {
  markers: SearchMapMarker[];
  className?: string;
  mapHeightClass?: string;
  selectedId?: string | null;
  onMarkerSelect?: (id: string) => void;
  ariaLabel?: string;
};

function useMapContainerReady(containerRef: RefObject<HTMLDivElement | null>) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setReady(el.offsetWidth > 0 && el.offsetHeight > 0);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  return ready;
}

export function SearchResultsMap({
  markers,
  className = "",
  mapHeightClass = "h-[calc(100vh-120px)]",
  selectedId,
  onMarkerSelect,
  ariaLabel = "Search results map",
}: SearchResultsMapProps) {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const containerReady = useMapContainerReady(containerRef);

  useEffect(() => {
    fixLeafletDefaultIcons();
  }, []);

  const center =
    markers.length > 0
      ? ([markers[0].lat, markers[0].lng] as [number, number])
      : ESTONIA_CENTER;

  return (
    <div
      ref={containerRef}
      className={`swmp-pet-search-map min-h-[320px] overflow-hidden rounded-3xl border border-black/[0.06] bg-surface shadow-[0_2px_16px_rgba(0,0,0,0.06)] ${mapHeightClass} ${className}`}
    >
      {containerReady ? (
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          className="h-full w-full min-h-[240px]"
          aria-label={ariaLabel}
        >
          <TileLayer
            attribution={
              isDark
                ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }
            url={isDark ? CARTO_DARK : OSM_LIGHT}
          />
          <FitBounds markers={markers} />
          <FlyToSelected markers={markers} selectedId={selectedId} />
          {markers.map((marker) => (
            <SearchMapMarkerItem
              key={marker.id}
              marker={marker}
              selected={selectedId === marker.id}
              dimmed={Boolean(selectedId && selectedId !== marker.id)}
              onMarkerSelect={onMarkerSelect}
            />
          ))}
        </MapContainer>
      ) : (
        <div
          className="flex h-full min-h-[240px] w-full items-center justify-center bg-mint/10 text-sm text-muted"
          aria-busy="true"
        >
          {t.search.loadingMap}
        </div>
      )}
    </div>
  );
}
