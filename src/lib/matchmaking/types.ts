export const MATCH_SCORE_WEIGHTS = {
  location: 30,
  availability: 25,
  species: 20,
  size: 10,
  careType: 10,
  completeness: 5,
} as const;

export const MATCH_MIN_SCORE = 60;
export const MATCH_MAX_PER_USER = 3;
export const MATCH_COOLDOWN_DAYS = 21;
export const MATCH_EXPIRY_DAYS = 21;

export type MatchScoreBreakdown = {
  location: number;
  availability: number;
  species: number;
  size: number;
  careType: number;
  completeness: number;
  total: number;
};

export type MatchScoreInput = {
  parentAreaKey: string | null;
  friendAreaKey: string | null;
  parentCoords: { lat: number; lng: number } | null;
  friendCoords: { lat: number; lng: number } | null;
  petAvailabilityDates: string[];
  friendAvailabilityDates: string[];
  /** YYYY-MM-DD; dates before this are expired. Defaults to the job run date. */
  runDateIso?: string;
  petSpecies: string | null;
  friendPetTypes: string[];
  petSizeKey: string | null;
  friendPreferredSizes: string[];
  petCareTypes: string[];
  friendCareTypes: string[];
  friendCompletenessPercent: number;
};

export type AvailabilityMatchStatus = "overlap" | "unknown" | "conflict";

export type ScoredMatch = MatchScoreBreakdown & {
  reasons: string[];
  availabilityStatus: AvailabilityMatchStatus;
  /** True when both sides have current/future dates with no overlap (Case C). */
  availabilityConflict: boolean;
};
