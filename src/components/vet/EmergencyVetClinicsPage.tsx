"use client";

import { PageHero } from "@/components/layout/PageHero";
import { PageMain } from "@/components/layout/PageMain";
import { VetClinicList } from "@/components/vet/VetClinicList";
import { useProfile } from "@/context/ProfileContext";
import { useLanguage } from "@/context/LanguageContext";
import { CONTENT_CONTAINER } from "@/lib/layout";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import { VET_CLINICS } from "@/data/vet-clinics";
import { extractCityFromLocation } from "@/lib/vet-clinics";
import { useMemo, useState } from "react";

export function EmergencyVetClinicsPage() {
  const { t } = useLanguage();
  const v = t.vetClinics;
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
      <PageHero variant="mint" badge={v.badge} title={v.title} description={v.subtitle} />

      <PageMain>
        <section className="pb-6">
          <div className={CONTENT_CONTAINER}>
            <div className={`${PUBLIC_CARD} max-w-3xl`}>
              <p className="text-sm leading-relaxed text-muted sm:text-base">{v.intro}</p>
            </div>
          </div>
        </section>

        <section className="pb-8">
          <div className={CONTENT_CONTAINER}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className={PUBLIC_SECTION_TITLE}>{v.sectionTitle}</h2>
                {profileCity && !showAllEstonia && !filterCity ? (
                  <p className="mt-1 text-xs text-muted">
                    {v.showingCity.replace("{city}", profileCity)}{" "}
                    <button
                      type="button"
                      className="font-semibold text-brand-teal hover:text-brand-pink"
                      onClick={() => setShowAllEstonia(true)}
                    >
                      {v.showAllEstonia}
                    </button>
                  </p>
                ) : null}
              </div>
              <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                {v.filterByCity}
                <select
                  value={filterCity}
                  onChange={(e) => {
                    setFilterCity(e.target.value);
                    setShowAllEstonia(true);
                  }}
                  className="min-h-[40px] rounded-xl border border-black/10 bg-surface px-3 text-sm text-foreground shadow-sm"
                >
                  <option value="">{v.allCities}</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <VetClinicList city={activeCity || undefined} emptyMessage={v.emptyMessage} showViewAll={false} />
          </div>
        </section>

        <section className="pb-12">
          <div className={CONTENT_CONTAINER}>
            <div className={`${PUBLIC_CARD} max-w-3xl border-amber-200/60 bg-amber-50/40`}>
              <h2 className={PUBLIC_SECTION_TITLE}>{v.disclaimerTitle}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                {v.disclaimer.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm">
                <a href="/contact" className="font-semibold text-brand-teal hover:text-brand-pink">
                  {v.contactSuggest}
                </a>{" "}
                {v.contactSuggestSuffix}
              </p>
            </div>
          </div>
        </section>
      </PageMain>
    </>
  );
}
