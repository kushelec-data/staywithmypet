import { formatCareTypeLabel } from "@/lib/care-type-options";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { formatPetTypeLabel, normalizePetTypeList, normalizePetTypeValue } from "@/lib/pet-type-options";
import {
  normalizePetWeightStorageValue,
  petWeightCategoryShortLabel,
} from "@/lib/pet-weight";
import { haversineKm, titleCaseArea } from "@/lib/matchmaking/location";
import {
  MATCH_SCORE_WEIGHTS,
  type AvailabilityMatchStatus,
  type MatchScoreBreakdown,
  type MatchScoreInput,
  type ScoredMatch,
} from "@/lib/matchmaking/types";

export function matchmakingRunDateIso(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Keep YYYY-MM-DD dates on or after the matchmaking run date (today is valid). */
export function currentAvailabilityDates(raw: unknown, runDateIso: string): string[] {
  return normalizeAvailabilityDates(raw).filter((iso) => iso >= runDateIso);
}

function overlapDates(a: string[], b: string[]): string[] {
  const wanted = new Set(b.map((d) => d.slice(0, 10)));
  return a.map((d) => d.slice(0, 10)).filter((d) => wanted.has(d));
}

export type AvailabilityEvaluation = {
  status: AvailabilityMatchStatus;
  points: number;
  reason: string | null;
};

/**
 * Case A: both have current/future dates and they overlap → +25.
 * Case B: either side has no current/future dates → 0, still eligible.
 * Case C: both have current/future dates with no overlap → conflict (exclude).
 */
export function evaluateAvailabilityMatch(
  petDates: unknown,
  friendDates: unknown,
  runDateIso: string,
): AvailabilityEvaluation {
  const pet = currentAvailabilityDates(petDates, runDateIso);
  const friend = currentAvailabilityDates(friendDates, runDateIso);
  if (!pet.length || !friend.length) {
    return { status: "unknown", points: 0, reason: null };
  }
  const shared = overlapDates(pet, friend);
  if (!shared.length) {
    return { status: "conflict", points: 0, reason: null };
  }
  return {
    status: "overlap",
    points: MATCH_SCORE_WEIGHTS.availability,
    reason: "Available on matching dates",
  };
}

function listsOverlap(a: string[], b: string[]): boolean {
  const left = new Set(a.map((v) => v.trim().toLowerCase()).filter(Boolean));
  if (!left.size) return false;
  return b.some((v) => left.has(v.trim().toLowerCase()));
}

function scoreLocation(input: MatchScoreInput): { points: number; reason: string | null } {
  const { location: max } = MATCH_SCORE_WEIGHTS;
  if (input.parentAreaKey && input.friendAreaKey && input.parentAreaKey === input.friendAreaKey) {
    return { points: max, reason: `Both in ${titleCaseArea(input.parentAreaKey)}` };
  }
  if (input.parentCoords && input.friendCoords) {
    const km = haversineKm(input.parentCoords, input.friendCoords);
    if (km <= 25) return { points: 22, reason: "Close by (within 25 km)" };
    if (km <= 50) return { points: 12, reason: "Nearby (within 50 km)" };
  }
  return { points: 0, reason: null };
}

function scoreSpecies(input: MatchScoreInput): { points: number; reason: string | null } {
  const species = normalizePetTypeValue(input.petSpecies);
  if (!species) return { points: 0, reason: null };
  const accepted = normalizePetTypeList(input.friendPetTypes);
  if (!accepted.length) return { points: 0, reason: null };
  if (!accepted.includes(species) && !accepted.includes("other")) {
    return { points: 0, reason: null };
  }
  const speciesNoun: Record<string, string> = {
    dog: "dogs",
    cat: "cats",
    rabbit: "rabbits",
    bird: "birds",
  };
  return {
    points: MATCH_SCORE_WEIGHTS.species,
    reason: `Comfortable with ${speciesNoun[species] ?? formatPetTypeLabel(species).toLowerCase()}`,
  };
}

function scoreSize(input: MatchScoreInput): { points: number; reason: string | null } {
  const petSize = normalizePetWeightStorageValue(input.petSizeKey);
  if (!petSize) return { points: 0, reason: null };
  const preferred = input.friendPreferredSizes
    .map((s) => normalizePetWeightStorageValue(s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  if (!preferred.length || !preferred.includes(petSize)) return { points: 0, reason: null };
  const sizeLabel = petWeightCategoryShortLabel(petSize) ?? petSize;
  return {
    points: MATCH_SCORE_WEIGHTS.size,
    reason: `Suitable for ${sizeLabel} pets`,
  };
}

function scoreCareType(input: MatchScoreInput): { points: number; reason: string | null } {
  const petTypes = input.petCareTypes.map((v) => v.trim()).filter(Boolean);
  const friendTypes = input.friendCareTypes.map((v) => v.trim()).filter(Boolean);
  if (!petTypes.length || !friendTypes.length) return { points: 0, reason: null };
  const match = petTypes.find((petType) =>
    friendTypes.some(
      (friendType) => friendType.toLowerCase() === petType.toLowerCase(),
    ),
  );
  if (!match && !listsOverlap(petTypes, friendTypes)) return { points: 0, reason: null };
  const label = formatCareTypeLabel(match ?? petTypes[0]) ?? match ?? petTypes[0];
  return {
    points: MATCH_SCORE_WEIGHTS.careType,
    reason: `Offers ${label.toLowerCase()}`,
  };
}

function scoreCompleteness(percent: number): { points: number; reason: string | null } {
  const clamped = Math.max(0, Math.min(100, percent));
  const points = Math.round((clamped / 100) * MATCH_SCORE_WEIGHTS.completeness);
  if (points <= 0) return { points: 0, reason: null };
  return { points, reason: null };
}

export function scoreMatch(input: MatchScoreInput): ScoredMatch {
  const runDateIso = input.runDateIso ?? matchmakingRunDateIso(new Date());
  const location = scoreLocation(input);
  const availability = evaluateAvailabilityMatch(
    input.petAvailabilityDates,
    input.friendAvailabilityDates,
    runDateIso,
  );
  const species = scoreSpecies(input);
  const size = scoreSize(input);
  const careType = scoreCareType(input);
  const completeness = scoreCompleteness(input.friendCompletenessPercent);

  const breakdown: MatchScoreBreakdown = {
    location: location.points,
    availability: availability.points,
    species: species.points,
    size: size.points,
    careType: careType.points,
    completeness: completeness.points,
    total: 0,
  };
  breakdown.total =
    breakdown.location +
    breakdown.availability +
    breakdown.species +
    breakdown.size +
    breakdown.careType +
    breakdown.completeness;

  const reasons = [
    location.reason,
    availability.reason,
    species.reason,
    size.reason,
    careType.reason,
  ].filter((reason): reason is string => Boolean(reason));

  return {
    ...breakdown,
    reasons: reasons.slice(0, 3),
    availabilityStatus: availability.status,
    availabilityConflict: availability.status === "conflict",
  };
}

export function pairKey(parentId: string, friendId: string, petId: string): string {
  return `${parentId}:${friendId}:${petId}`;
}

export function relationshipKey(parentId: string, friendId: string): string {
  return `${parentId}:${friendId}`;
}

export function utcIsoWeekKey(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
