import type { ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRole } from "@/lib/profile-setup";

export type AvailabilityUxFlags = {
  /** Personal calendar / `details.availability.selected_dates` (Pet Friend). */
  showMyAvailability: boolean;
  /** Per-pet care dates on dashboard and pet forms (Pet Parent). */
  showPetCareDates: boolean;
  /** Personal availability block on profile edit. */
  showPersonalAvailabilityEditor: boolean;
};

/**
 * Availability UI follows dashboard **mode** only — one account can use both modes,
 * but each mode shows the relevant surfaces (not both at once).
 */
export function availabilityUxForProfile(
  _role: ProfileRole,
  activeMode: ProfileActiveMode,
): AvailabilityUxFlags {
  const showMyAvailability = activeMode === "pet_friend";
  const showPetCareDates = activeMode === "pet_parent";
  return {
    showMyAvailability,
    showPetCareDates,
    showPersonalAvailabilityEditor: showMyAvailability,
  };
}
