import { formatPetTypeLabel } from "@/lib/pet-type-options";
import {
  formatLivingTypeLabel,
  profileCalendarSelectedDates,
  resolvedAvailability,
  resolvedLivingSituation,
  resolvedPetCarePreferences,
  type ProfileDetails,
} from "@/lib/profile-details";
import {
  formatExperienceLevelLabel,
  formatPetTypesWillingComfort,
  formatPreferredCareLocationLabel,
} from "@/lib/pet-care-labels";
import { formatPreferredPetWeightSizes } from "@/lib/pet-weight";
import { formatCareTypeLabel } from "@/lib/care-type-options";
import { formatListWithOtherDisplay } from "@/lib/other-option";

function joinNatural(items: string[], max = 4): string | null {
  const slice = items.filter(Boolean).slice(0, max);
  if (!slice.length) return null;
  if (slice.length === 1) return slice[0];
  if (slice.length === 2) return `${slice[0]} and ${slice[1]}`;
  return `${slice.slice(0, -1).join(", ")}, and ${slice[slice.length - 1]}`;
}

function willingLabel(value: boolean | null | undefined, yes: string, no?: string): string | null {
  if (value === true) return yes;
  if (value === false && no) return no;
  return null;
}

export type ProfileSummaryLines = {
  title: string;
  lines: string[];
  emptyMessage: string;
  /** Calendar ISO dates rendered as chips (not comma text in lines). */
  calendarDates?: string[];
  locale?: string;
};

export function buildLivingSituationSummary(
  details: ProfileDetails,
  options: { publicSafe?: boolean } = {},
): ProfileSummaryLines {
  const living = resolvedLivingSituation(details);
  const lines: string[] = [];

  const livingLabel = formatLivingTypeLabel(living.living_type, living.living_type_other);
  if (!options.publicSafe && livingLabel) {
    lines.push(livingLabel);
  } else if (options.publicSafe && living.living_type) {
    lines.push("Pet-friendly home");
  }

  if (living.has_children === false) {
    lines.push("No children at home");
  } else if (living.has_children === true) {
    lines.push(options.publicSafe ? "Children at home" : "Has children at home");
  }

  if (living.yard_garden_access === true) {
    lines.push("Yard or garden access");
  }

  if (living.nearby_park_access === true) {
    lines.push("Nearby park access");
  }

  if (living.has_pets_at_home === true) {
    const note = living.pets_at_home_notes?.trim();
    lines.push(note ? `Has pets at home (${note})` : "Has pets at home");
  } else if (living.has_pets_at_home === false) {
    lines.push("No pets at home");
  }

  return {
    title: "Your living situation",
    lines,
    emptyMessage: "Describe your home so Pet Parents know what to expect.",
  };
}

export function buildPetCarePreferencesSummary(details: ProfileDetails): ProfileSummaryLines {
  const care = resolvedPetCarePreferences(details);
  const lines: string[] = [];

  const typeComfort = formatPetTypesWillingComfort(
    care.pet_types_willing_to_care_for ?? [],
    care.pet_types_willing_other,
  );
  if (typeComfort.length) {
    lines.push(...typeComfort.slice(0, 3));
  }

  const sizes = care.preferred_pet_sizes ?? [];
  if (sizes.length) {
    const labels = formatPreferredPetWeightSizes(sizes);
    lines.push(`${labels.join(", ")} weight range${sizes.length > 1 ? "s" : ""}`);
  }

  const careTypes = formatListWithOtherDisplay(
    care.available_care_types ?? [],
    care.available_care_types_other,
    (value) => formatCareTypeLabel(value, care.available_care_types_other) ?? value,
  );
  if (careTypes.length) {
    lines.push(joinNatural(careTypes, 4) ?? "");
  }

  const locationLabel = formatPreferredCareLocationLabel(care.preferred_care_location);
  if (locationLabel) {
    lines.push(locationLabel);
  }

  const experienceLabel = formatExperienceLevelLabel(care.experience_level);
  if (experienceLabel) {
    lines.push(experienceLabel);
  }

  const borrowed = (care.pet_types_previously_borrowed ?? [])
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => formatPetTypeLabel(t, care.pet_types_previously_borrowed_other))
    .filter((label) => label.trim().length > 0);
  if (borrowed.length) {
    lines.push(`Previously cared for ${joinNatural(borrowed, 4)}`);
  }

  const willing = [
    willingLabel(care.willing_special_medical_needs, "Open to special medical needs"),
    willingLabel(care.willing_behavioral_quirks, "Comfortable with behavioral quirks"),
    willingLabel(care.willing_seniors, "Happy to care for senior pets"),
    willingLabel(care.willing_puppies_kittens, "Happy with puppies & kittens"),
  ].filter((x): x is string => Boolean(x));

  if (willing.length) lines.push(...willing.slice(0, 2));

  return {
    title: "Pet care preferences",
    lines: lines.filter(Boolean),
    emptyMessage: "Add what care you're comfortable offering.",
  };
}

export function buildAvailabilitySummary(
  details: ProfileDetails,
  options?: { locale?: string },
): ProfileSummaryLines {
  const avail = resolvedAvailability(details);
  const lines: string[] = [];

  const days = Array.isArray(avail.preferred_days_times)
    ? avail.preferred_days_times
    : typeof avail.preferred_days_times === "string" && avail.preferred_days_times.trim()
      ? [avail.preferred_days_times.trim()]
      : [];

  if (days.length) {
    lines.push(joinNatural(days, 5) ?? "");
  }

  if (avail.duration_of_care_preferred?.trim()) {
    lines.push(avail.duration_of_care_preferred.trim());
  }

  if (avail.weekdays?.trim() && !days.some((d) => d.toLowerCase().includes("weekday"))) {
    lines.push(`Weekdays: ${avail.weekdays.trim()}`);
  }
  if (avail.weekends?.trim() && !days.some((d) => d.toLowerCase().includes("weekend"))) {
    lines.push(`Weekends: ${avail.weekends.trim()}`);
  }

  const calendarDates = profileCalendarSelectedDates(details);

  if (avail.notes?.trim()) {
    lines.push(avail.notes.trim());
  }

  return {
    title: "Availability",
    lines: lines.filter(Boolean),
    calendarDates: calendarDates.length ? calendarDates : undefined,
    locale: options?.locale,
    emptyMessage: "Add when you're available to help.",
  };
}

export function hasPetCarePreferencesSummary(details: ProfileDetails): boolean {
  return buildPetCarePreferencesSummary(details).lines.length > 0;
}

export function hasLivingSituationSummary(details: ProfileDetails): boolean {
  return buildLivingSituationSummary(details).lines.length > 0;
}

export function hasAvailabilitySummary(
  details: ProfileDetails,
  options?: { locale?: string },
): boolean {
  const summary = buildAvailabilitySummary(details, options);
  return summary.lines.length > 0 || Boolean(summary.calendarDates?.length);
}

export function publicAvailabilitySummary(
  details: ProfileDetails,
  options?: { locale?: string },
): string | null {
  const summary = buildAvailabilitySummary(details, options);
  if (summary.lines.length) return summary.lines.join(" · ");
  if (summary.calendarDates?.length) return "Selected dates on calendar";
  return null;
}
