/**
 * Shared selectable chip / toggle pill tokens.
 * Selected: solid green fill, white label + icon.
 * Unselected: white fill, light gray border, dark label + icon.
 */
export const SELECTABLE_CHIP_COLORS = {
  selectedBg: "#1F6B3D",
  selectedBgHover: "#1A5A33",
  selectedBorder: "#1F6B3D",
  selectedText: "#FFFFFF",
  unselectedBg: "#FFFFFF",
  unselectedBorder: "#E5E2D8",
  unselectedBorderHover: "#D5D2C8",
  unselectedText: "#333333",
  unselectedHoverBg: "#F8F6F1",
} as const;

export const SELECTABLE_CHIP_BASE_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F6B3D] disabled:cursor-not-allowed disabled:opacity-60";

export const SELECTABLE_CHIP_SELECTED_CLASS =
  "border-[#1F6B3D] bg-[#1F6B3D] font-semibold text-white shadow-sm hover:border-[#1A5A33] hover:bg-[#1A5A33]";

export const SELECTABLE_CHIP_UNSELECTED_CLASS =
  "border-[#E5E2D8] bg-white font-medium text-[#333333] hover:border-[#D5D2C8] hover:bg-[#F8F6F1]";

export const SELECTABLE_CHIP_ICON_SELECTED_CLASS = "text-white";

export const SELECTABLE_CHIP_ICON_UNSELECTED_CLASS = "text-[#333333]";

export function selectableChipClass(selected: boolean, extra?: string): string {
  return `${SELECTABLE_CHIP_BASE_CLASS} ${selected ? SELECTABLE_CHIP_SELECTED_CLASS : SELECTABLE_CHIP_UNSELECTED_CLASS}${extra ? ` ${extra}` : ""}`;
}

export function selectableChipIconClass(selected: boolean): string {
  return selected ? SELECTABLE_CHIP_ICON_SELECTED_CLASS : SELECTABLE_CHIP_ICON_UNSELECTED_CLASS;
}
