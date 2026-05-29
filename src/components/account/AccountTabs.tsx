"use client";

import { ACCOUNT_TAB_ACTIVE_CLASS, ACCOUNT_TAB_INACTIVE_CLASS } from "@/lib/account-ui";

export type AccountTabItem<T extends string = string> = {
  id: T;
  label: string;
};

type AccountTabsProps<T extends string> = {
  tabs: AccountTabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  "aria-label"?: string;
};

export function AccountTabs<T extends string>({
  tabs,
  activeId,
  onChange,
  className = "",
  "aria-label": ariaLabel,
}: AccountTabsProps<T>) {
  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={isActive ? ACCOUNT_TAB_ACTIVE_CLASS : ACCOUNT_TAB_INACTIVE_CLASS}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
