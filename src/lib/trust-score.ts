import { isBioCompleteForProfile } from "@/lib/profile-completeness";
import { parseEmergencyContactFromProfile } from "@/lib/trust-safety";

/** Profile fields used for trust scoring (dashboard + public). */
export type TrustScoreProfileSlice = {
  avatar_url: string | null;
  bio: string | null;
  phone_verified: boolean;
  phone?: string | null;
  phone_e164?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone_e164?: string | null;
  details: unknown;
};

/** Live stats that affect trust (bookings, reviews, email). */
export type TrustScoreStats = {
  emailVerified: boolean;
  completedBookingsCount: number;
  reviewsAsRevieweeCount: number;
  /** When public profile infers phone verification differently than the column alone. */
  phoneVerified?: boolean;
};

export type TrustScoreInput = {
  emailVerified: boolean;
  phoneVerified: boolean;
  hasProfilePhoto: boolean;
  bioComplete: boolean;
  hasCompletedBooking: boolean;
  hasReviewAsReviewee: boolean;
  hasEmergencyContact: boolean;
};

export type TrustCheckId =
  | "email"
  | "phone"
  | "photo"
  | "bio"
  | "emergency"
  | "reviews"
  | "bookings";

export type TrustCheckStatus = "completed" | "pending" | "missing";

export type TrustCheck = {
  id: TrustCheckId;
  weight: number;
  status: TrustCheckStatus;
  /** True only when this check counts toward the score (not pending phone-on-file). */
  completed: boolean;
};

export const TRUST_CHECK_WEIGHTS: Record<TrustCheckId, number> = {
  email: 15,
  phone: 15,
  photo: 15,
  bio: 10,
  emergency: 10,
  reviews: 15,
  bookings: 20,
};

export type TrustScoreBreakdown = TrustScoreInput & {
  checks: TrustCheck[];
  percent: number;
};

export function buildTrustChecks(
  input: TrustScoreInput,
  phoneOnFile: boolean,
): TrustCheck[] {
  return [
    {
      id: "email",
      weight: TRUST_CHECK_WEIGHTS.email,
      completed: input.emailVerified,
      status: input.emailVerified ? "completed" : "missing",
    },
    {
      id: "phone",
      weight: TRUST_CHECK_WEIGHTS.phone,
      completed: input.phoneVerified,
      status: input.phoneVerified
        ? "completed"
        : phoneOnFile
          ? "pending"
          : "missing",
    },
    {
      id: "photo",
      weight: TRUST_CHECK_WEIGHTS.photo,
      completed: input.hasProfilePhoto,
      status: input.hasProfilePhoto ? "completed" : "missing",
    },
    {
      id: "bio",
      weight: TRUST_CHECK_WEIGHTS.bio,
      completed: input.bioComplete,
      status: input.bioComplete ? "completed" : "missing",
    },
    {
      id: "emergency",
      weight: TRUST_CHECK_WEIGHTS.emergency,
      completed: input.hasEmergencyContact,
      status: input.hasEmergencyContact ? "completed" : "missing",
    },
    {
      id: "reviews",
      weight: TRUST_CHECK_WEIGHTS.reviews,
      completed: input.hasReviewAsReviewee,
      status: input.hasReviewAsReviewee ? "completed" : "missing",
    },
    {
      id: "bookings",
      weight: TRUST_CHECK_WEIGHTS.bookings,
      completed: input.hasCompletedBooking,
      status: input.hasCompletedBooking ? "completed" : "missing",
    },
  ];
}

export function percentFromTrustChecks(checks: TrustCheck[]): number {
  const sum = checks.filter((c) => c.completed).reduce((s, c) => s + c.weight, 0);
  return Math.min(100, sum);
}

/** Weights sum to 100% max. */
export function computeTrustScorePercent(input: TrustScoreInput): number {
  return percentFromTrustChecks(buildTrustChecks(input, false));
}

/** Shared display value, e.g. `85%` (label is `trustScoreTitle` in i18n). */
export function formatTrustScoreDisplay(percent: number): string {
  const n = Math.min(100, Math.max(0, Math.round(percent)));
  return `${n}%`;
}

export function phoneOnFileFromProfile(
  profile: Pick<TrustScoreProfileSlice, "phone" | "phone_e164">,
): boolean {
  return Boolean(profile.phone_e164?.trim() || profile.phone?.trim());
}

/**
 * Single entry point for trust score (dashboard, public profile, profile save).
 */
export function calculateTrustScore(
  profile: TrustScoreProfileSlice,
  stats: TrustScoreStats,
  options?: { phoneOnFile?: boolean },
): TrustScoreBreakdown {
  const phoneOnFile = options?.phoneOnFile ?? phoneOnFileFromProfile(profile);
  const emergency = parseEmergencyContactFromProfile({
    emergency_contact_name: profile.emergency_contact_name ?? null,
    emergency_contact_phone_e164: profile.emergency_contact_phone_e164 ?? null,
    details: profile.details,
  });
  const trustInput = trustInputFromProfileSnapshot({
    emailVerified: stats.emailVerified,
    phoneVerified: stats.phoneVerified ?? profile.phone_verified,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    completedBookingsCount: stats.completedBookingsCount,
    reviewsAsRevieweeCount: stats.reviewsAsRevieweeCount,
    hasEmergencyContact: Boolean(emergency),
  });
  return buildTrustBreakdown(trustInput, { phoneOnFile });
}

export function buildTrustBreakdown(
  input: TrustScoreInput,
  options?: { phoneOnFile?: boolean },
): TrustScoreBreakdown {
  const checks = buildTrustChecks(input, options?.phoneOnFile ?? false);
  return { ...input, checks, percent: percentFromTrustChecks(checks) };
}

export function trustScoreTierClass(percent: number): string {
  if (percent >= 90) return "text-brand-teal";
  if (percent >= 70) return "text-brand-teal/90";
  if (percent >= 40) return "text-amber-700";
  return "text-red-600";
}

export function trustScoreBarClass(percent: number): string {
  if (percent >= 90) return "bg-brand-teal";
  if (percent >= 70) return "bg-brand-teal/80";
  if (percent >= 40) return "bg-amber-500";
  return "bg-red-500/80";
}

export function trustInputFromProfileSnapshot(args: {
  emailVerified: boolean;
  phoneVerified: boolean;
  avatarUrl: string | null | undefined;
  bio: string | null | undefined;
  completedBookingsCount: number;
  reviewsAsRevieweeCount: number;
  hasEmergencyContact: boolean;
}): TrustScoreInput {
  return {
    emailVerified: args.emailVerified,
    phoneVerified: args.phoneVerified,
    hasProfilePhoto: Boolean(args.avatarUrl?.trim()),
    bioComplete: isBioCompleteForProfile(args.bio),
    hasCompletedBooking: args.completedBookingsCount > 0,
    hasReviewAsReviewee: args.reviewsAsRevieweeCount > 0,
    hasEmergencyContact: args.hasEmergencyContact,
  };
}
