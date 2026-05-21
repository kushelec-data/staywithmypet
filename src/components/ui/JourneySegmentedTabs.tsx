"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { journeys } from "@/lib/journeys";

type JourneySegmentedTabsProps = {
  pathname: string;
};

export function JourneySegmentedTabs({ pathname }: JourneySegmentedTabsProps) {
  const { t } = useLanguage();

  const tabs = [
    {
      id: "pet-friend" as const,
      href: journeys["pet-friend"].searchHref,
      label: t.roles.petFriend.label,
      subtitle: t.roles.petFriend.tagline,
      match: "/find-pets",
    },
    {
      id: "pet-parent" as const,
      href: journeys["pet-parent"].searchHref,
      label: t.roles.petParent.label,
      subtitle: t.roles.petParent.tagline,
      match: "/find-care",
    },
  ];

  return (
    <div className="flex min-w-0 justify-center px-1">
      <div
        role="tablist"
        aria-label={t.common.chooseJourney}
        className="inline-flex w-full max-w-full flex-row gap-1 rounded-full bg-mint/45 p-1 shadow-sm ring-1 ring-black/5 sm:w-auto"
      >
        {tabs.map((tab) => {
          const selected = pathname === tab.match;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              role="tab"
              aria-selected={selected}
              className={`min-h-[44px] min-w-0 flex-1 rounded-full px-3 py-2 text-center transition-all duration-200 sm:flex-none sm:px-5 sm:py-2.5 ${
                selected
                  ? "bg-brand-teal text-white shadow-md shadow-brand-teal/20"
                  : "text-muted hover:bg-mint/60 hover:text-foreground"
              }`}
            >
              <span className="block text-xs font-semibold sm:text-sm">{tab.label}</span>
              <span
                className={`mt-0.5 block text-[0.65rem] leading-tight sm:text-xs ${
                  selected ? "text-white/85" : "text-muted"
                }`}
              >
                {tab.subtitle}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
