"use client";

import type { LucideIcon } from "lucide-react";
import { Calendar, MapPin, PawPrint, User, Users } from "lucide-react";
import type { ExplainerMockCopy } from "@/components/how-it-works/ExplainerVideoMock";

type JourneyAccent = "parent" | "friend";

type ExplainerJourneyStaticCardProps = {
  accent: JourneyAccent;
  copy: ExplainerMockCopy;
};

const PARENT_STEP_ICONS: LucideIcon[] = [Users, Calendar, Calendar];
const FRIEND_STEP_ICONS: LucideIcon[] = [User, PawPrint, MapPin];

export function ExplainerJourneyStaticCard({ accent, copy }: ExplainerJourneyStaticCardProps) {
  const steps = copy.scenes.slice(0, 3);
  const stepIcons = accent === "parent" ? PARENT_STEP_ICONS : FRIEND_STEP_ICONS;
  const isParent = accent === "parent";

  return (
    <div className="min-w-0 overflow-x-hidden">
      <div
        className={`overflow-hidden rounded-2xl border px-4 py-5 sm:px-5 sm:py-6 ${
          isParent
            ? "border-brand-teal/20 bg-gradient-to-br from-mint/30 via-cream/60 to-surface"
            : "border-brand-pink/15 bg-gradient-to-br from-amber-50/70 via-surface to-brand-pink/5"
        }`}
        aria-hidden
      >
        <div className="flex min-w-0 items-center justify-center gap-3 sm:gap-5">
          {steps.map((scene, index) => {
            const Icon = stepIcons[index] ?? PawPrint;
            return (
              <div
                key={scene.title}
                className="flex min-w-0 max-w-[33%] flex-1 flex-col items-center gap-2"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${
                    isParent
                      ? "bg-brand-teal/15 text-brand-teal ring-1 ring-brand-teal/20"
                      : "bg-brand-pink/15 text-brand-pink ring-1 ring-brand-pink/20"
                  }`}
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} aria-hidden />
                </span>
                <span
                  className={`line-clamp-2 text-center text-[10px] font-semibold leading-tight sm:text-xs ${
                    isParent ? "text-brand-teal" : "text-brand-pink"
                  }`}
                >
                  {scene.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ol className="mt-4 min-w-0 space-y-3" aria-label={copy.ariaLabel}>
        {steps.map((scene, index) => (
          <li key={scene.title} className="flex min-w-0 gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isParent
                  ? "bg-brand-teal/15 text-brand-teal"
                  : "bg-brand-pink/15 text-brand-pink"
              }`}
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{scene.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted sm:text-sm">{scene.caption}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
