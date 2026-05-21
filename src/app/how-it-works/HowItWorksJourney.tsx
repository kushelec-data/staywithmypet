"use client";

import { Fragment, type ComponentType } from "react";
import {
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Heart,
  MessageCircle,
  PawPrint,
  Search,
  Send,
  ShieldCheck,
  Star,
  UserCircle,
} from "lucide-react";
import { CONTENT_CONTAINER } from "@/lib/layout";

const SECTION_PAD = "py-10 lg:py-12";

type JourneyStep = {
  title: string;
  subtitle: string;
};

type JourneyIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

function SearchPetsIcon({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return (
    <span className={`relative inline-flex ${className ?? ""}`}>
      <Search className="h-full w-full" strokeWidth={strokeWidth ?? 1.75} aria-hidden />
      <PawPrint
        className="absolute -bottom-0.5 -right-1 h-[38%] w-[38%] text-brand-teal/70"
        strokeWidth={2.25}
        aria-hidden
      />
    </span>
  );
}

const PET_FRIEND_ICONS: JourneyIcon[] = [UserCircle, SearchPetsIcon, CalendarDays, Heart];
const PET_PARENT_ICONS: JourneyIcon[] = [PawPrint, ShieldCheck, CalendarCheck, MessageCircle];
const TIMELINE_ICONS: JourneyIcon[] = [UserCircle, Send, MessageCircle, CalendarCheck, Star];

function StepNumberBadge({ number }: { number: number }) {
  return (
    <span className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand-teal font-heading text-[10px] font-bold text-white shadow-sm ring-2 ring-surface">
      {number}
    </span>
  );
}

function IconCircle({ Icon, accent }: { Icon: JourneyIcon; accent: "friend" | "parent" }) {
  const ringClass =
    accent === "friend" ? "ring-brand-pink/15 shadow-brand-pink/5" : "ring-brand-teal/15 shadow-brand-teal/5";

  return (
    <div
      className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-mint/80 to-mint/45 shadow-md ring-4 sm:h-16 sm:w-16 ${ringClass}`}
    >
      <Icon className="h-6 w-6 text-brand-teal sm:h-7 sm:w-7" strokeWidth={1.75} aria-hidden />
    </div>
  );
}

function DesktopStepTile({
  step,
  index,
  Icon,
  accent,
}: {
  step: JourneyStep;
  index: number;
  Icon: JourneyIcon;
  accent: "friend" | "parent";
}) {
  return (
    <li className="relative flex min-w-0 flex-1 flex-col items-center">
      <div className="relative w-full max-w-[9.5rem] rounded-3xl border border-black/[0.06] bg-surface/95 px-3 py-4 shadow-sm sm:max-w-[10.5rem] sm:px-4 sm:py-5">
        <StepNumberBadge number={index + 1} />
        <div className="flex justify-center">
          <IconCircle Icon={Icon} accent={accent} />
        </div>
        <h3 className="font-heading mt-3 text-center text-xs font-semibold leading-snug text-foreground sm:text-sm">
          {step.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-center text-[11px] text-muted sm:text-xs">{step.subtitle}</p>
      </div>
    </li>
  );
}

function MobileTimelineStep({
  step,
  index,
  Icon,
  accent,
  isLast,
}: {
  step: JourneyStep;
  index: number;
  Icon: JourneyIcon;
  accent: "friend" | "parent";
  isLast: boolean;
}) {
  return (
    <li className="flex w-full max-w-[16rem] flex-col items-center">
      <div className="relative">
        <StepNumberBadge number={index + 1} />
        <IconCircle Icon={Icon} accent={accent} />
      </div>
      <h3 className="font-heading mt-3 text-center text-sm font-semibold text-foreground">{step.title}</h3>
      <p className="mt-1 line-clamp-1 text-center text-xs text-muted">{step.subtitle}</p>
      {!isLast ? (
        <div className="mt-4 flex flex-col items-center py-1" aria-hidden>
          <span className="h-5 w-px border-l-2 border-dotted border-brand-teal/35" />
          <ChevronDown className="h-4 w-4 text-brand-teal/50" strokeWidth={2.25} />
          <span className="h-5 w-px border-l-2 border-dotted border-brand-teal/35" />
        </div>
      ) : null}
    </li>
  );
}

function HorizontalConnector() {
  return (
    <li className="flex shrink-0 items-center self-center px-0.5 pt-6 sm:px-1" aria-hidden>
      <div className="flex items-center">
        <span className="h-px w-4 border-t-2 border-dotted border-brand-teal/35 sm:w-6" />
        <svg
          className="h-3.5 w-3.5 shrink-0 text-brand-teal/50 sm:h-4 sm:w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
        <span className="h-px w-4 border-t-2 border-dotted border-brand-teal/35 sm:w-6" />
      </div>
    </li>
  );
}

function JourneyRow({
  id,
  role,
  steps,
  icons,
  accent,
}: {
  id: string;
  role: string;
  steps: readonly JourneyStep[];
  icons: JourneyIcon[];
  accent: "friend" | "parent";
}) {
  return (
    <section id={id} className={`scroll-mt-28 ${SECTION_PAD}`}>
      <div className={CONTENT_CONTAINER}>
        <div className="min-w-0 rounded-3xl border border-black/[0.04] bg-gradient-to-br from-cream/80 via-sand/30 to-mint/25 px-4 py-6 shadow-sm sm:px-6 sm:py-8 lg:px-8">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.14em] ${
              accent === "parent" ? "text-brand-teal" : "text-brand-pink/90"
            }`}
          >
            {role}
          </p>

          <ol className="mt-6 hidden min-w-0 items-start justify-center lg:flex">
            {steps.map((step, index) => (
              <Fragment key={step.title}>
                <DesktopStepTile step={step} index={index} Icon={icons[index]!} accent={accent} />
                {index < steps.length - 1 ? <HorizontalConnector /> : null}
              </Fragment>
            ))}
          </ol>

          <ol className="mt-6 flex min-w-0 flex-col items-center lg:hidden">
            {steps.map((step, index) => (
              <MobileTimelineStep
                key={step.title}
                step={step}
                index={index}
                Icon={icons[index]!}
                accent={accent}
                isLast={index === steps.length - 1}
              />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function TimelineFlow({ label, steps }: { label: string; steps: readonly string[] }) {
  return (
    <section className={`border-t border-black/5 ${SECTION_PAD}`}>
      <div className={CONTENT_CONTAINER}>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-brand-teal">{label}</p>
        <ol className="mt-5 flex min-w-0 flex-wrap items-center justify-center gap-y-3">
          {steps.map((step, index) => {
            const Icon = TIMELINE_ICONS[index]!;
            return (
              <li key={step} className="flex min-w-0 items-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-teal/15 bg-gradient-to-r from-mint/50 to-cream/60 px-3 py-1.5 text-xs font-semibold text-brand-teal shadow-sm sm:gap-2 sm:px-4 sm:text-sm">
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
                  {step}
                </span>
                {index < steps.length - 1 ? (
                  <span className="mx-1.5 flex items-center sm:mx-2" aria-hidden>
                    <span className="hidden h-px w-3 border-t border-dotted border-brand-teal/30 sm:inline sm:w-4" />
                    <svg
                      className="h-3 w-3 text-brand-teal/45 sm:h-3.5 sm:w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                    <span className="hidden h-px w-3 border-t border-dotted border-brand-teal/30 sm:inline sm:w-4" />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function HowItWorksJourney({
  petFriend,
  petParent,
  timeline,
}: {
  petFriend: { role: string; steps: readonly JourneyStep[] };
  petParent: { role: string; steps: readonly JourneyStep[] };
  timeline: { label: string; steps: readonly string[] };
}) {
  return (
    <>
      <JourneyRow
        id="pet-friend"
        role={petFriend.role}
        steps={petFriend.steps}
        icons={PET_FRIEND_ICONS}
        accent="friend"
      />
      <div className="border-t border-black/5">
        <JourneyRow
          id="pet-parent"
          role={petParent.role}
          steps={petParent.steps}
          icons={PET_PARENT_ICONS}
          accent="parent"
        />
      </div>
      <TimelineFlow label={timeline.label} steps={timeline.steps} />
    </>
  );
}
