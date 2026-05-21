"use client";

import { PageHero } from "@/components/layout/PageHero";
import { PageMain } from "@/components/layout/PageMain";
import { VetClinicList } from "@/components/vet/VetClinicList";
import { useProfile } from "@/context/ProfileContext";
import { CONTENT_CONTAINER } from "@/lib/layout";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import { VET_CLINICS } from "@/data/vet-clinics";
import { extractCityFromLocation } from "@/lib/vet-clinics";
import { useMemo, useState } from "react";

const DISCLAIMER = [
  "The clinic details shown on this page are compiled from publicly available sources for convenience only.",
  "Contact details, opening hours, and services may change over time.",
  "We recommend always verifying information directly on the clinic's official website or by contacting them before visiting.",
  "Stay With My Pet does not guarantee the accuracy or completeness of the listed information and is not responsible for services provided by third-party clinics.",
  "If you notice outdated information or would like to suggest a clinic, feel free to contact us — helping pets stay safe is a shared responsibility.",
];

export function EmergencyVetClinicsPage() {
  const { profile } = useProfile();
  const profileCity = extractCityFromLocation(profile?.location);
  const [filterCity, setFilterCity] = useState<string>("");

  const [showAllEstonia, setShowAllEstonia] = useState(false);
  const activeCity = showAllEstonia ? filterCity.trim() : filterCity.trim() || profileCity || "";

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const c of VET_CLINICS) if (c.city) set.add(c.city);
    return [...set].sort((a, b) => a.localeCompare(b, "et"));
  }, []);

  return (
    <>
      <PageHero
        variant="mint"
        badge="Pet safety"
        title="Nearby veterinary clinics"
        description="Find trusted animal clinics and emergency care across Estonia — for Pet Parents and Pet Friends before, during, and after bookings."
      />

      <PageMain>
        <section className="pb-6">
          <div className={CONTENT_CONTAINER}>
            <div className={`${PUBLIC_CARD} max-w-3xl`}>
              <p className="text-sm leading-relaxed text-muted sm:text-base">
                At Stay With My Pet, animal wellbeing always comes first. Explore veterinary clinics
                across Estonia so you can quickly find nearby support when it matters most.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-8">
          <div className={CONTENT_CONTAINER}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className={PUBLIC_SECTION_TITLE}>Nearby veterinary clinics</h2>
                {profileCity && !showAllEstonia && !filterCity ? (
                  <p className="mt-1 text-xs text-muted">
                    Showing clinics in {profileCity} from your profile.{" "}
                    <button
                      type="button"
                      className="font-semibold text-brand-teal hover:text-brand-pink"
                      onClick={() => setShowAllEstonia(true)}
                    >
                      Show all Estonia
                    </button>
                  </p>
                ) : null}
              </div>
              <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                Filter by city
                <select
                  value={filterCity}
                  onChange={(e) => {
                    setFilterCity(e.target.value);
                    setShowAllEstonia(true);
                  }}
                  className="min-h-[40px] rounded-xl border border-black/10 bg-surface px-3 text-sm text-foreground shadow-sm"
                >
                  <option value="">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <VetClinicList
              city={activeCity || undefined}
              emptyMessage="No clinics in this city yet."
              showViewAll={false}
            />
          </div>
        </section>

        <section className="pb-12">
          <div className={CONTENT_CONTAINER}>
            <div className={`${PUBLIC_CARD} max-w-3xl border-amber-200/60 bg-amber-50/40`}>
              <h2 className={PUBLIC_SECTION_TITLE}>Important note about clinic information</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                {DISCLAIMER.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm">
                <a href="/contact" className="font-semibold text-brand-teal hover:text-brand-pink">
                  Contact us
                </a>{" "}
                to suggest updates.
              </p>
            </div>
          </div>
        </section>
      </PageMain>
    </>
  );
}
