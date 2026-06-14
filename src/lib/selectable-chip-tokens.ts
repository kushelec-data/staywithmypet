/**
 * Shared selectable chip / toggle pill tokens.
 * Selected: light green fill, dark green border + text (#1F6B3D) for WCAG contrast.
 */
export const SELECTABLE_CHIP_COLORS = {
  selectedBg: "#DDEEDF",
  selectedBgHover: "#D0E8D8",
  selectedBorder: "#1F6B3D",
  selectedBorderHover: "#1A5A33",
  selectedText: "#1F6B3D",
  unselectedBg: "#FFFFFF",
  unselectedBorder: "rgba(0, 0, 0, 0.1)",
  unselectedText: "#333333",
  unselectedHoverBg: "#F8F6F1",
} as const;

export const SELECTABLE_CHIP_BASE_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F6B3D]";

export const SELECTABLE_CHIP_SELECTED_CLASS =
  "border-[#1F6B3D] bg-[#DDEEDF] font-semibold text-[#1F6B3D] hover:border-[#1A5A33] hover:bg-[#D0E8D8] dark:border-[#4a9460] dark:bg-[#2a3d32] dark:text-[#DDEEDF] dark:hover:border-[#5aa870] dark:hover:bg-[#324840]";

export const SELECTABLE_CHIP_UNSELECTED_CLASS =
  "border-black/10 bg-white font-medium text-[#333333] hover:border-black/15 hover:bg-[#F8F6F1] dark:border-white/10 dark:bg-[#1c2620] dark:text-foreground dark:hover:border-white/15 dark:hover:bg-[#243028]";

export const SELECTABLE_CHIP_ICON_SELECTED_CLASS = "text-[#1F6B3D] dark:text-[#DDEEDF]";

export const SELECTABLE_CHIP_ICON_UNSELECTED_CLASS = "text-[#333333]/70 dark:text-foreground/70";

export function selectableChipClass(selected: boolean, extra?: string): string {
  return `${SELECTABLE_CHIP_BASE_CLASS} ${selected ? SELECTABLE_CHIP_SELECTED_CLASS : SELECTABLE_CHIP_UNSELECTED_CLASS}${extra ? ` ${extra}` : ""}`;
}

export function selectableChipIconClass(selected: boolean): string {
  return selected ? SELECTABLE_CHIP_ICON_SELECTED_CLASS : SELECTABLE_CHIP_ICON_UNSELECTED_CLASS;
}
