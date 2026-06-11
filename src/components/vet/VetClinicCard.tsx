"use client";

import type { VetClinic } from "@/data/vet-clinics";
import { useLanguage } from "@/context/LanguageContext";
import {
  clinicMapUrl,
  formatPhoneDisplay,
  formatPhoneLink,
} from "@/lib/vet-clinics";
import { Building2, Clock, MapPin, Phone } from "lucide-react";

type VetClinicCardProps = {
  clinic: VetClinic;
  compact?: boolean;
};

export function VetClinicCard({ clinic, compact = false }: VetClinicCardProps) {
  const { t } = useLanguage();
  const labels = t.petPublicDetail;
  const tel = formatPhoneLink(clinic.phone);
  const mapHref = clinicMapUrl(clinic);

  return (
    <article
      className={`rounded-2xl border border-brand-teal/15 bg-gradient-to-br from-cream/80 via-surface to-mint/20 shadow-sm ${
        compact ? "p-3" : "p-4 sm:p-5"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-brand-teal"
          aria-hidden
        >
          <Building2 className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`font-heading font-semibold text-foreground ${compact ? "text-sm" : "text-base"}`}
            >
              {clinic.clinic_name}
            </h3>
            {clinic.emergency ? (
              <span className="rounded-full bg-brand-pink/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-pink">
                24/7
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <MapPin className="h-3 w-3 shrink-0 text-brand-teal/80" aria-hidden />
            <span>
              {clinic.city}
              {clinic.address ? ` · ${clinic.address}` : ""}
            </span>
          </p>
          {clinic.opening_hours ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <Clock className="h-3 w-3 shrink-0" aria-hidden />
              {clinic.opening_hours}
            </p>
          ) : null}
          {clinic.phone ? (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-foreground/90">
              <Phone className="h-3 w-3 shrink-0 text-brand-teal" aria-hidden />
              {formatPhoneDisplay(clinic.phone)}
            </p>
          ) : null}
        </div>
      </div>

      <div className={`flex flex-wrap gap-2 ${compact ? "mt-3" : "mt-4"}`}>
        {tel ? (
          <a
            href={tel}
            className="btn-interactive inline-flex min-h-[40px] items-center justify-center rounded-full bg-brand-teal px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-teal/20 hover:bg-brand-teal-hover"
          >
            {labels.call}
          </a>
        ) : null}
        <a
          href={mapHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-interactive inline-flex min-h-[40px] items-center justify-center rounded-full border border-black/10 bg-surface px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:border-brand-teal/30 hover:bg-mint/40"
        >
          {labels.map}
        </a>
      </div>
    </article>
  );
}
