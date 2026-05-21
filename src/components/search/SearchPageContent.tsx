"use client";

import { PetCard } from "@/components/pets/PetCard";
import { OwnerCard } from "@/components/owners/OwnerCard";
import { CareSearchParamsSync } from "@/components/search/CareSearchParamsSync";
import { PetFriendSearchFilters } from "@/components/search/PetFriendSearchFilters";
import { PetSearchFilters } from "@/components/search/PetSearchFilters";
import { SearchMapFriendCard, SearchMapPetCard } from "@/components/search/SearchMapResultCard";
import { useLanguage } from "@/context/LanguageContext";
import {
  emptyPetFriendSearchFilters,
  filterPetFriendSearchProfiles,
  type PetFriendSearchFilterState,
} from "@/lib/pet-friend-search";
import { SearchResultsMapDynamic } from "@/components/maps/SearchResultsMapDynamic";
import {
  emptyPetSearchFilters,
  fetchPublicSearchPets,
  filterPublicSearchPets,
  publicSearchPetToCardPet,
  publicSearchPetToMapMarker,
  type PetSearchFilterState,
  type PublicSearchPet,
} from "@/lib/public-pet-search";
import {
  fetchPetFriendSearchProfiles,
  searchProfileToMapMarker,
  type SearchProfile,
} from "@/lib/search-profiles";
import type { Pet } from "@/lib/pets";
import { createClient } from "@/lib/supabase";
import type { Dictionary } from "@/i18n/translations";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export type SearchPageMode = "pets" | "care";

type SearchViewMode = "list" | "map";

type SearchPageContentProps = {
  mode: SearchPageMode;
};

const MAP_RESULTS_SCROLL_CLASS =
  "max-h-[calc(100vh-160px)] overflow-y-auto overscroll-contain pr-1";

const SEARCH_MAP_GRID_CLASS =
  "gap-3 lg:grid-cols-[280px_360px_minmax(420px,1fr)] lg:items-start lg:gap-6";

const SEARCH_MAP_HEIGHT_CLASS =
  "min-h-[520px] h-[50vh] h-full lg:h-[calc(100vh-160px)]";

function SearchViewToggle({
  viewMode,
  onChange,
  listLabel,
  mapLabel,
}: {
  viewMode: SearchViewMode;
  onChange: (mode: SearchViewMode) => void;
  listLabel: string;
  mapLabel: string;
}) {
  return (
    <div
      className="inline-flex shrink-0 rounded-full border border-black/[0.08] bg-surface p-1 shadow-sm"
      role="group"
      aria-label="Results view"
    >
      {(["list", "map"] as const).map((mode) => {
        const active = viewMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            aria-pressed={active}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-brand-teal text-white shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {mode === "list" ? listLabel : mapLabel}
          </button>
        );
      })}
    </div>
  );
}

function SearchMapTopBar({
  resultsText,
  privacyNote,
  showPrivacyNote,
  viewMode,
  onViewModeChange,
  listLabel,
  mapLabel,
}: {
  resultsText: string;
  privacyNote: string;
  showPrivacyNote: boolean;
  viewMode: SearchViewMode;
  onViewModeChange: (mode: SearchViewMode) => void;
  listLabel: string;
  mapLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] pb-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">{resultsText}</p>
        {showPrivacyNote ? (
          <p className="text-xs text-muted">{privacyNote}</p>
        ) : null}
      </div>
      <SearchViewToggle
        viewMode={viewMode}
        onChange={onViewModeChange}
        listLabel={listLabel}
        mapLabel={mapLabel}
      />
    </div>
  );
}

const SEARCH_RESULTS_GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3 sm:gap-4";

function resultsGridClass(extra = ""): string {
  return `${SEARCH_RESULTS_GRID_CLASS} ${extra}`;
}

function SearchResultsGrid({
  loading,
  isPets,
  displayPets,
  displayProfiles,
  t,
  className = "",
}: {
  loading: boolean;
  isPets: boolean;
  displayPets: Pet[];
  displayProfiles: SearchProfile[];
  t: Dictionary;
  className?: string;
}) {
  return (
    <div className={`${resultsGridClass()} ${className}`}>
      {loading ? (
        <p className="col-span-full text-sm text-muted">
          {isPets ? t.search.loadingPets : t.search.loadingProfiles}
        </p>
      ) : isPets ? (
        displayPets.length === 0 ? (
          <p className="col-span-full text-sm text-muted">{t.search.emptyPets}</p>
        ) : (
          displayPets.map((pet) => (
            <article key={pet.id} id={`pet-${pet.id}`} className="min-w-0">
              <PetCard pet={pet} compact />
            </article>
          ))
        )
      ) : displayProfiles.length === 0 ? (
        <p className="col-span-full text-sm text-muted">{t.search.emptyProfiles}</p>
      ) : (
        displayProfiles.map((profile) => (
          <article key={profile.id} id={`profile-${profile.id}`} className="min-w-0">
            <OwnerCard profile={profile} compact />
          </article>
        ))
      )}
    </div>
  );
}

function SearchMapResultsList({
  loading,
  isPets,
  displayPets,
  displayProfiles,
  selectedId,
  onCardSelect,
  t,
  dimUnselected = true,
}: {
  loading: boolean;
  isPets: boolean;
  displayPets: Pet[];
  displayProfiles: SearchProfile[];
  selectedId: string | null;
  onCardSelect: (id: string) => void;
  t: Dictionary;
  dimUnselected?: boolean;
}) {
  if (loading) {
    return (
      <p className="text-sm text-muted">
        {isPets ? t.search.loadingPets : t.search.loadingProfiles}
      </p>
    );
  }

  if (isPets) {
    if (displayPets.length === 0) {
      return <p className="text-sm text-muted">{t.search.emptyPets}</p>;
    }
    return (
      <ul className="flex flex-col gap-2">
        {displayPets.map((pet) => {
          const selected = selectedId === pet.id;
          return (
            <li
              key={pet.id}
              className={`min-w-0 ${dimUnselected && selectedId && !selected ? "opacity-60" : ""}`}
            >
              <SearchMapPetCard
                pet={pet}
                selected={selected}
                onSelect={() => onCardSelect(pet.id)}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  if (displayProfiles.length === 0) {
    return <p className="text-sm text-muted">{t.search.emptyProfiles}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {displayProfiles.map((profile) => {
        const selected = selectedId === profile.id;
        return (
          <li
            key={profile.id}
            className={`min-w-0 ${dimUnselected && selectedId && !selected ? "opacity-60" : ""}`}
          >
            <SearchMapFriendCard
              profile={profile}
              selected={selected}
              onSelect={() => onCardSelect(profile.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}

export function SearchPageContent({ mode }: SearchPageContentProps) {
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const isPets = mode === "pets";

  const [allPets, setAllPets] = useState<PublicSearchPet[]>([]);
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [petFilters, setPetFilters] = useState<PetSearchFilterState>(emptyPetSearchFilters);
  const [appliedPetFilters, setAppliedPetFilters] =
    useState<PetSearchFilterState>(emptyPetSearchFilters);
  const [friendFilters, setFriendFilters] = useState<PetFriendSearchFilterState>(
    emptyPetFriendSearchFilters,
  );
  const [appliedFriendFilters, setAppliedFriendFilters] = useState<PetFriendSearchFilterState>(
    emptyPetFriendSearchFilters,
  );
  const [viewMode, setViewMode] = useState<SearchViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        if (isPets) {
          const rows = await fetchPublicSearchPets(supabase);
          if (!cancelled) {
            setAllPets(rows);
            setProfiles([]);
          }
        } else {
          const rows = await fetchPetFriendSearchProfiles(supabase);
          if (!cancelled) {
            setProfiles(rows);
            setAllPets([]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setAllPets([]);
          setProfiles([]);
          setLoadError(err instanceof Error ? err.message : "Could not load results.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isPets, supabase]);

  const filteredSearchPets = useMemo(() => {
    if (!isPets) return [];
    return filterPublicSearchPets(allPets, appliedPetFilters);
  }, [allPets, appliedPetFilters, isPets]);

  const displayPets = useMemo(() => {
    if (!isPets) return [];
    return filteredSearchPets.map(publicSearchPetToCardPet);
  }, [filteredSearchPets, isPets]);

  const displayProfiles = useMemo(() => {
    if (isPets) return [];
    return filterPetFriendSearchProfiles(profiles, appliedFriendFilters);
  }, [profiles, appliedFriendFilters, isPets]);

  const petMapMarkers = useMemo(() => {
    if (!isPets) return [];
    return filteredSearchPets
      .map(publicSearchPetToMapMarker)
      .filter((m): m is NonNullable<ReturnType<typeof publicSearchPetToMapMarker>> => m !== null);
  }, [filteredSearchPets, isPets]);

  const friendMapMarkers = useMemo(() => {
    if (isPets) return [];
    return displayProfiles
      .map(searchProfileToMapMarker)
      .filter((m): m is NonNullable<ReturnType<typeof searchProfileToMapMarker>> => m !== null);
  }, [displayProfiles, isPets]);

  const mapMarkers = isPets ? petMapMarkers : friendMapMarkers;
  const mapLabels = isPets ? t.findPets : t.findCare;

  const resultCount = isPets ? displayPets.length : displayProfiles.length;
  const resultsText = (isPets ? t.findPets.results : t.findCare.results).replace(
    "{count}",
    String(resultCount),
  );

  const applyCareTypesFromUrl = useCallback((types: string[]) => {
    setFriendFilters((prev) => ({ ...prev, careTypesOffered: types }));
    setAppliedFriendFilters((prev) => ({ ...prev, careTypesOffered: types }));
  }, []);

  useEffect(() => {
    setViewMode("list");
    setSelectedId(null);
    setMobileFiltersOpen(false);
  }, [mode]);

  const showMapLayout = viewMode === "map";
  const hasMapMarkers = mapMarkers.length > 0;

  const handleCardSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleMarkerSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  useEffect(() => {
    if (!showMapLayout || !selectedId) return;
    const el = document.getElementById(
      isPets ? `map-card-pet-${selectedId}` : `map-card-profile-${selectedId}`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId, showMapLayout, isPets]);

  const selectedPet = isPets && selectedId ? displayPets.find((p) => p.id === selectedId) : null;
  const selectedProfile =
    !isPets && selectedId ? displayProfiles.find((p) => p.id === selectedId) : null;

  const filtersPanel = isPets ? (
    <PetSearchFilters
      searchMode="pets"
      filters={petFilters}
      onChange={setPetFilters}
      onApply={() => setAppliedPetFilters({ ...petFilters })}
      onClearAll={() => {
        const empty = emptyPetSearchFilters();
        setPetFilters(empty);
        setAppliedPetFilters(empty);
      }}
    />
  ) : (
    <PetFriendSearchFilters
      filters={friendFilters}
      onChange={setFriendFilters}
      onApply={() => setAppliedFriendFilters({ ...friendFilters })}
      onClearAll={() => {
        const empty = emptyPetFriendSearchFilters();
        setFriendFilters(empty);
        setAppliedFriendFilters(empty);
      }}
    />
  );

  return (
    <div
      className={`grid min-w-0 grid-cols-1 ${
        showMapLayout
          ? SEARCH_MAP_GRID_CLASS
          : "gap-6 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-8"
      }`}
    >
      {!isPets ? <CareSearchParamsSync enabled onCareTypes={applyCareTypesFromUrl} /> : null}

      {/* Filters — desktop column; mobile list = inline, mobile map = sheet */}
      <div
        className={`min-w-0 ${
          showMapLayout ? "hidden lg:block lg:col-start-1 lg:row-start-1 lg:self-start" : ""
        } ${mobileFiltersOpen && showMapLayout ? "!block" : ""}`}
      >
        {filtersPanel}
      </div>

      {showMapLayout ? (
        <>
          {/* Mobile map: filter sheet trigger + overlay */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm"
              aria-expanded={mobileFiltersOpen}
            >
              {isPets ? t.searchFilters.petSearch : t.searchFilters.petFriendSearch}
              <span className="text-muted" aria-hidden>
                {mobileFiltersOpen ? "▲" : "▼"}
              </span>
            </button>
          </div>
          {mobileFiltersOpen ? (
            <div className="rounded-2xl border border-black/[0.08] bg-surface p-4 shadow-lg lg:hidden">
              {filtersPanel}
            </div>
          ) : null}

          {/* Results column: top bar + scrollable list (desktop); top bar only on mobile map */}
          <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-start-1">
            <SearchMapTopBar
              resultsText={resultsText}
              privacyNote={mapLabels.mapPrivacyNote}
              showPrivacyNote={!loading && hasMapMarkers}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              listLabel={mapLabels.listView}
              mapLabel={mapLabels.mapView}
            />
            {loadError ? (
              <p
                className="rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink"
                role="alert"
              >
                {loadError}
              </p>
            ) : null}
            <div className={`hidden min-w-0 lg:block ${MAP_RESULTS_SCROLL_CLASS}`}>
              <SearchMapResultsList
                loading={loading}
                isPets={isPets}
                displayPets={displayPets}
                displayProfiles={displayProfiles}
                selectedId={selectedId}
                onCardSelect={handleCardSelect}
                t={t}
              />
            </div>
          </div>

          {/* Map column — directly under top bar on mobile */}
          <div className="relative min-h-[520px] min-w-0 h-full lg:col-start-3 lg:row-start-1 lg:self-start">
            {loading ? (
              <p className="text-sm text-muted">
                {isPets ? t.search.loadingPets : t.search.loadingProfiles}
              </p>
            ) : !hasMapMarkers ? (
              <p className="text-sm text-muted">{mapLabels.mapNoLocations}</p>
            ) : (
              <SearchResultsMapDynamic
                mountKey={`${mode}-map`}
                markers={mapMarkers}
                selectedId={selectedId}
                onMarkerSelect={handleMarkerSelect}
                className="h-full lg:sticky lg:top-24"
                mapHeightClass={SEARCH_MAP_HEIGHT_CLASS}
                ariaLabel={isPets ? "Pet locations map" : "Pet Friend locations map"}
              />
            )}
          </div>

          {/* Mobile: selected card bottom sheet */}
          {!loading && hasMapMarkers && (selectedPet || selectedProfile) ? (
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-4 lg:hidden">
              <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-black/[0.08] bg-surface/95 p-2 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm">
                <button
                  type="button"
                  className="mb-1 flex w-full justify-center py-1 text-xs text-muted"
                  onClick={() => setSelectedId(null)}
                  aria-label="Dismiss selection"
                >
                  <span className="h-1 w-10 rounded-full bg-black/15" aria-hidden />
                </button>
                {selectedPet ? (
                  <SearchMapPetCard
                    pet={selectedPet}
                    selected
                    onSelect={() => handleCardSelect(selectedPet.id)}
                  />
                ) : selectedProfile ? (
                  <SearchMapFriendCard
                    profile={selectedProfile}
                    selected
                    onSelect={() => handleCardSelect(selectedProfile.id)}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">{resultsText}</p>
            <SearchViewToggle
              viewMode={viewMode}
              onChange={setViewMode}
              listLabel={mapLabels.listView}
              mapLabel={mapLabels.mapView}
            />
          </div>

          {loadError ? (
            <p
              className="mt-4 rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink"
              role="alert"
            >
              {loadError}
            </p>
          ) : null}

          <SearchResultsGrid
            loading={loading}
            isPets={isPets}
            displayPets={displayPets}
            displayProfiles={displayProfiles}
            t={t}
            className="mt-4 sm:mt-5"
          />
        </div>
      )}

      {!isPets ? (
        <p
          className={`text-center text-sm text-muted sm:mt-8 ${
            showMapLayout ? "lg:col-span-3 lg:col-start-1" : "mt-6 sm:mt-8"
          }`}
        >
          {t.findPets.paymentNote}{" "}
          <Link href="/how-it-works" className="font-semibold text-brand-teal hover:underline">
            {t.common.learnHowItWorks}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
