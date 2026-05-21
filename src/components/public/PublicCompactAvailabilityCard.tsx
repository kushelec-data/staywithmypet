"use client";

import { PetPublicAvailabilityCalendar } from "@/components/pets/PetPublicAvailabilityCalendar";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDateRange } from "@/lib/date-format";
import { normalizeAvailabilityDates, parseISODateLocal } from "@/lib/pet-availability";
import { PUBLIC_CARD, PUBLIC_SECTION_TITLE } from "@/lib/public-layout";
import { useMemo, useState } from "react";

type PublicCompactAvailabilityCardProps = {
  petId?: string;
  petFriendId?: string;
  availableDates: string[];
  availabilityNotes?: string | null;
  visibility?: "full" | "public";
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function mondayIndex(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

export function PublicCompactAvailabilityCard({
  petId,
  petFriendId,
  availableDates,
  availabilityNotes,
  visibility = "public",
}: PublicCompactAvailabilityCardProps) {
  const available = useMemo(() => normalizeAvailabilityDates(availableDates), [availableDates]);
  const availableSet = useMemo(() => new Set(available), [available]);
  const [expanded, setExpanded] = useState(false);

  const chips = useMemo(() => {
    const out: string[] = [];
    if (available.length) {
      out.push("Next available");
      if (available.length === 1) {
        out.push(formatDate(available[0]!));
      } else {
        out.push(formatDateRange(available[0]!, available[available.length - 1]!));
      }
    }
    if (availabilityNotes?.trim()) out.push(availabilityNotes.trim());
    return out;
  }, [available, availabilityNotes]);

  const miniMonth = useMemo(() => {
    const anchor = available[0] ? parseISODateLocal(available[0]!) : new Date();
    const base = anchor ?? new Date();
    const year = base.getFullYear();
    const month = base.getMonth();
    const title = base.toLocaleString(undefined, { month: "long", year: "numeric" });
    const first = new Date(year, month, 1);
    const lead = mondayIndex(first);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < lead; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    return { year, month, title, cells };
  }, [available]);

  function isoFor(day: number): string {
    const y = miniMonth.year;
    const m = miniMonth.month;
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <section className={PUBLIC_CARD}>
      <h2 className={PUBLIC_SECTION_TITLE}>Availability</h2>

      {chips.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-brand-teal/20 bg-mint/40 px-2.5 py-0.5 text-xs font-semibold text-brand-teal"
            >
              {chip}
            </li>
          ))}
        </ul>
      ) : null}

      {available.length > 0 ? (
        <div className="mt-3 rounded-xl border border-brand-teal/15 bg-mint/15 p-2">
          <p className="text-center text-xs font-semibold text-foreground">{miniMonth.title}</p>
          <div className="mt-1 grid grid-cols-7 gap-0.5 text-center text-[0.6rem] font-medium text-muted">
            {WEEKDAYS.map((d, i) => (
              <span key={`${d}-${i}`}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {miniMonth.cells.map((day, idx) => {
              if (day === null) return <span key={`e-${idx}`} className="aspect-square" />;
              const iso = isoFor(day);
              const on = availableSet.has(iso);
              return (
                <span
                  key={iso}
                  className={`flex aspect-square items-center justify-center rounded-md text-[0.65rem] font-semibold ${
                    on ? "bg-brand-teal text-white" : "text-muted/40"
                  }`}
                >
                  {day}
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">No dates listed yet.</p>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-3 w-full justify-center text-brand-teal"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Hide full calendar" : "View full calendar"}
      </Button>

      {expanded ? (
        <div className="mt-3 border-t border-black/5 pt-3">
          <PetPublicAvailabilityCalendar
            petId={petId}
            petFriendId={petFriendId}
            availableDates={available}
            availabilityNotes={availabilityNotes}
            visibility={visibility}
            viewRole={petFriendId && visibility === "full" ? "pet-friend" : undefined}
          />
        </div>
      ) : null}
    </section>
  );
}
