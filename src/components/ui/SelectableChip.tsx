"use client";

import type { ReactNode } from "react";
import {
  selectableChipClass,
  selectableChipIconClass,
} from "@/lib/selectable-chip-tokens";

type SelectableChipProps = {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
  trailing?: ReactNode;
};

/** Shared toggle pill for profile forms, pet forms, and search filters. */
export function SelectableChip({
  selected,
  onClick,
  children,
  disabled,
  icon,
  className,
  trailing,
}: SelectableChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={selectableChipClass(selected, className)}
    >
      {icon ? (
        <span className={`${selectableChipIconClass(selected)} [&_svg]:stroke-current`} aria-hidden>
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
      {trailing}
    </button>
  );
}
