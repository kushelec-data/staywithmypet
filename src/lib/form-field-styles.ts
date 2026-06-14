/** Shared field label — uppercase, bold, muted green-gray. */
export const FORM_FIELD_LABEL_CLASS = "form-field-label";

/** Same styling for `<legend>` in fieldsets. */
export const FORM_FIELD_LEGEND_CLASS = "form-field-label";

export {
  SELECTABLE_CHIP_BASE_CLASS,
  SELECTABLE_CHIP_COLORS,
  SELECTABLE_CHIP_ICON_SELECTED_CLASS,
  SELECTABLE_CHIP_ICON_UNSELECTED_CLASS,
  SELECTABLE_CHIP_SELECTED_CLASS,
  SELECTABLE_CHIP_UNSELECTED_CLASS,
  selectableChipClass,
  selectableChipIconClass,
} from "@/lib/selectable-chip-tokens";

/** @deprecated Prefer `selectableChipClass(false)` — unselected chip text styling. */
export const FORM_FIELD_CHIP_VALUE_CLASS =
  "text-sm font-medium text-[#333333] dark:text-foreground";

/** @deprecated Prefer `SELECTABLE_CHIP_SELECTED_CLASS` — selected chip text styling. */
export const FORM_FIELD_CHIP_VALUE_SELECTED_CLASS =
  "text-sm font-semibold text-[#1F6B3D] dark:text-[#DDEEDF]";

/** Yes / No and similar inline option labels. */
export const FORM_FIELD_OPTION_LABEL_CLASS =
  "flex items-center gap-2 text-sm font-medium text-[#333333] dark:text-foreground";
