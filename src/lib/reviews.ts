import type { SupabaseClient } from "@supabase/supabase-js";
import type { Booking } from "@/lib/bookings";
import { isMissingRelationError, isPostgrestError } from "@/lib/supabase-errors";
import { formatSupabaseError } from "@/lib/profile-load";

export const REVIEW_TYPE_PARENT_FRIEND = "pet_parent_reviews_pet_friend" as const;
export const REVIEW_TYPE_FRIEND_PET = "pet_friend_reviews_pet" as const;

export type ReviewType = typeof REVIEW_TYPE_PARENT_FRIEND | typeof REVIEW_TYPE_FRIEND_PET;

export const PET_FRIEND_REVIEW_TAG_KEYS = [
  "reliable",
  "friendly",
  "good_communication",
  "sent_updates",
  "on_time",
  "caring",
  "followed_instructions",
] as const;

export const PET_EXPERIENCE_REVIEW_TAG_KEYS = [
  "calm",
  "friendly",
  "easy_to_care_for",
  "energetic",
  "shy",
  "needs_medication",
  "good_on_walks",
] as const;

/** @deprecated Use {@link PET_FRIEND_REVIEW_TAG_KEYS}. */
export const PET_FRIEND_REVIEW_TAGS = PET_FRIEND_REVIEW_TAG_KEYS;

/** @deprecated Use {@link PET_EXPERIENCE_REVIEW_TAG_KEYS}. */
export const PET_EXPERIENCE_REVIEW_TAGS = PET_EXPERIENCE_REVIEW_TAG_KEYS;

export type PetFriendReviewTag = (typeof PET_FRIEND_REVIEW_TAG_KEYS)[number];
export type PetExperienceReviewTag = (typeof PET_EXPERIENCE_REVIEW_TAG_KEYS)[number];
export type ReviewTagKey = PetFriendReviewTag | PetExperienceReviewTag;

const LEGACY_REVIEW_TAG_KEYS: Record<string, ReviewTagKey> = {
  Reliable: "reliable",
  Friendly: "friendly",
  "Good communication": "good_communication",
  "Sent updates": "sent_updates",
  "On time": "on_time",
  Caring: "caring",
  "Followed instructions": "followed_instructions",
  Calm: "calm",
  "Easy to care for": "easy_to_care_for",
  Energetic: "energetic",
  Shy: "shy",
  "Needs medication": "needs_medication",
  "Good on walks": "good_on_walks",
};

export type ReviewTagLabels = {
  friendTags: Record<string, string>;
  petTags: Record<string, string>;
};

/** Normalize stored tag values (legacy English labels or keys) to stable keys. */
export function normalizeReviewTagKey(tag: string): string {
  const trimmed = tag.trim();
  if (!trimmed) return trimmed;
  return LEGACY_REVIEW_TAG_KEYS[trimmed] ?? trimmed;
}

export function reviewTagLabel(
  tag: string,
  labels: ReviewTagLabels,
  reviewType?: ReviewType,
): string {
  const key = normalizeReviewTagKey(tag);
  const bucket = reviewType && isPetExperienceReviewType(reviewType) ? labels.petTags : labels.friendTags;
  return bucket[key] ?? labels.friendTags[key] ?? labels.petTags[key] ?? tag;
}

export const REVIEW_TEXT_MIN = 10;
export const REVIEW_TEXT_MAX = 500;

export function isPetExperienceReviewType(reviewType: ReviewType): boolean {
  return reviewType === REVIEW_TYPE_FRIEND_PET;
}

const REVIEW_SELECT =
  "id, booking_id, request_id, reviewer_id, reviewee_id, pet_id, rating, text, tags, review_type, created_at" as const;

export type ReviewRow = {
  id: string;
  booking_id: string;
  request_id: string | null;
  reviewer_id: string;
  reviewee_id: string;
  pet_id: string;
  rating: number;
  text: string | null;
  tags: string[] | null;
  review_type: ReviewType;
  created_at: string;
};

export type ReviewDisplay = {
  id: string;
  bookingId: string;
  rating: number;
  text: string | null;
  tags: string[];
  reviewType: ReviewType;
  createdAt: string;
  createdAtLabel: string;
  reviewerName: string;
  reviewerId: string;
  petName: string | null;
};

export type ReviewTypeLabels = {
  parentFriend: string;
  friendPet: string;
};

export function reviewTypeHeading(reviewType: ReviewType, labels: ReviewTypeLabels): string {
  return reviewType === REVIEW_TYPE_PARENT_FRIEND ? labels.parentFriend : labels.friendPet;
}

export type SubmitReviewInput = {
  bookingId: string;
  requestId: string | null;
  petId: string;
  revieweeId: string;
  reviewType: ReviewType;
  rating: number;
  text: string | null;
  tags: string[];
};

export class DuplicateReviewError extends Error {
  constructor() {
    super("DUPLICATE_REVIEW");
    this.name = "DuplicateReviewError";
  }
}

export function isDuplicateReviewError(error: unknown): boolean {
  if (error instanceof DuplicateReviewError) return true;
  if (!isPostgrestError(error)) return false;

  const blob = `${error.message} ${error.details ?? ""} ${error.hint ?? ""}`;
  if (/reviews_one_per_reviewer_per_booking/i.test(blob)) return true;
  if (/Key \(booking_id, reviewer_id\)/i.test(blob)) return true;
  if (error.code !== "23505") return false;

  return /booking_id.*reviewer_id|reviewer_id.*booking_id/i.test(blob);
}

/** Whether the signed-in user may still leave a review for this booking. */
export function userNeedsToReviewBooking(
  booking: Pick<Booking, "petParentId" | "petFriendId" | "displayStatus">,
  userId: string,
  myReview: Pick<ReviewDisplay, "reviewerId"> | Pick<ReviewRow, "reviewer_id"> | null | undefined,
): boolean {
  if (myReview && isReviewAuthoredByUser(myReview, userId)) return false;
  return reviewTypeForBookingParticipant(booking, userId) !== null;
}

/** True when the review row belongs to the signed-in user (not another participant). */
export function isReviewAuthoredByUser(
  review: Pick<ReviewDisplay, "reviewerId"> | Pick<ReviewRow, "reviewer_id"> | null | undefined,
  userId: string,
): boolean {
  if (!review || !userId) return false;
  const reviewerId =
    "reviewerId" in review ? review.reviewerId : (review as ReviewRow).reviewer_id;
  return reviewerId === userId;
}

function formatReviewDate(createdAt: string): string {
  try {
    return new Date(createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return createdAt;
  }
}

function mapReviewRow(
  row: ReviewRow,
  names: { reviewers: Map<string, string>; pets: Map<string, string> },
): ReviewDisplay {
  return {
    id: row.id,
    bookingId: row.booking_id,
    rating: row.rating,
    text: row.text?.trim() || null,
    tags: (row.tags ?? []).filter((t): t is string => typeof t === "string"),
    reviewType: row.review_type,
    createdAt: row.created_at,
    createdAtLabel: formatReviewDate(row.created_at),
    reviewerName: names.reviewers.get(row.reviewer_id) ?? "Member",
    reviewerId: row.reviewer_id,
    petName: names.pets.get(row.pet_id) ?? null,
  };
}

/** Which review the current user may leave for this booking, if any. */
export function reviewTypeForBookingParticipant(
  booking: Pick<Booking, "petParentId" | "petFriendId" | "displayStatus">,
  userId: string,
): ReviewType | null {
  if (booking.displayStatus !== "completed") return null;
  if (userId === booking.petParentId) return REVIEW_TYPE_PARENT_FRIEND;
  if (userId === booking.petFriendId) return REVIEW_TYPE_FRIEND_PET;
  return null;
}

export function revieweeIdForType(
  booking: Pick<Booking, "petParentId" | "petFriendId">,
  reviewType: ReviewType,
): string {
  return reviewType === REVIEW_TYPE_PARENT_FRIEND
    ? booking.petFriendId
    : booking.petParentId;
}

export function tagsForReviewType(reviewType: ReviewType): readonly ReviewTagKey[] {
  return reviewType === REVIEW_TYPE_PARENT_FRIEND
    ? PET_FRIEND_REVIEW_TAG_KEYS
    : PET_EXPERIENCE_REVIEW_TAG_KEYS;
}

export async function fetchMyReviewsForBookings(
  supabase: SupabaseClient,
  userId: string,
  bookingIds: string[],
): Promise<Map<string, ReviewRow>> {
  if (!bookingIds.length) return new Map();

  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("reviewer_id", userId)
    .in("booking_id", bookingIds);

  if (error) {
    if (isMissingRelationError(error)) return new Map();
    throw error;
  }

  return new Map((data ?? []).map((r) => [r.booking_id as string, r as ReviewRow]));
}

export async function fetchMyReviewForBooking(
  supabase: SupabaseClient,
  userId: string,
  bookingId: string,
): Promise<ReviewRow | null> {
  if (!userId || !bookingId) return null;

  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("booking_id", bookingId)
    .eq("reviewer_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }

  return (data as ReviewRow | null) ?? null;
}

export async function fetchMyReviewDisplayForBooking(
  supabase: SupabaseClient,
  userId: string,
  bookingId: string,
): Promise<ReviewDisplay | null> {
  const map = await fetchMyReviewDisplaysForBookings(supabase, userId, [bookingId]);
  return map.get(bookingId) ?? null;
}

/** Current user's reviews for bookings, enriched for display. */
export async function fetchMyReviewDisplaysForBookings(
  supabase: SupabaseClient,
  userId: string,
  bookingIds: string[],
): Promise<Map<string, ReviewDisplay>> {
  const rowMap = await fetchMyReviewsForBookings(supabase, userId, bookingIds);
  if (!rowMap.size) return new Map();

  const displays = await enrichReviews(supabase, [...rowMap.values()]);
  const byId = new Map(displays.map((d) => [d.id, d]));

  const result = new Map<string, ReviewDisplay>();
  for (const row of rowMap.values()) {
    const display = byId.get(row.id);
    if (display) result.set(row.booking_id, display);
  }
  return result;
}

/** All reviews for one booking (both participants). */
export async function fetchReviewsForBooking(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<ReviewDisplay[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }

  return enrichReviews(supabase, (data ?? []) as ReviewRow[]);
}

export async function submitReview(
  supabase: SupabaseClient,
  userId: string,
  input: SubmitReviewInput,
): Promise<void> {
  const trimmedText = input.text?.trim() || "";
  if (trimmedText.length < REVIEW_TEXT_MIN) {
    throw new Error("Please write a few words about your experience.");
  }
  if (trimmedText.length > REVIEW_TEXT_MAX) {
    throw new Error(`Review text must be at most ${REVIEW_TEXT_MAX} characters.`);
  }

  const existing = await fetchMyReviewForBooking(supabase, userId, input.bookingId);
  if (existing) {
    throw new DuplicateReviewError();
  }

  const payload: Record<string, unknown> = {
    booking_id: input.bookingId,
    reviewer_id: userId,
    reviewee_id: input.revieweeId,
    pet_id: input.petId,
    rating: input.rating,
    text: trimmedText || null,
    tags: input.tags,
    review_type: input.reviewType,
  };

  if (input.requestId) {
    payload.request_id = input.requestId;
  }

  const { error } = await supabase.from("reviews").insert(payload);

  if (error) {
    if (isDuplicateReviewError(error)) {
      throw new DuplicateReviewError();
    }
    throw error;
  }
}

async function enrichReviews(
  supabase: SupabaseClient,
  rows: ReviewRow[],
): Promise<ReviewDisplay[]> {
  if (!rows.length) return [];

  const reviewerIds = [...new Set(rows.map((r) => r.reviewer_id))];
  const petIds = [...new Set(rows.map((r) => r.pet_id))];

  const [{ data: profiles }, { data: pets }] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", reviewerIds),
    supabase.from("pets").select("id, name").in("id", petIds),
  ]);

  const reviewers = new Map(
    (profiles ?? []).map((p) => [p.id as string, (p.display_name as string)?.trim() || "Member"]),
  );
  const petNames = new Map((pets ?? []).map((p) => [p.id as string, p.name as string]));

  return rows.map((row) => mapReviewRow(row, { reviewers, pets: petNames }));
}

export function summarizeReviews(reviews: ReviewDisplay[]): { ratingAvg: number; ratingCount: number } {
  if (!reviews.length) return { ratingAvg: 0, ratingCount: 0 };
  const ratingCount = reviews.length;
  const ratingAvg = reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount;
  return { ratingAvg, ratingCount };
}

/** All reviews received by a profile (any review_type). */
export async function fetchReviewsForProfile(
  supabase: SupabaseClient,
  profileId: string,
  limit = 50,
): Promise<ReviewDisplay[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("reviewee_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }

  return enrichReviews(supabase, (data ?? []) as ReviewRow[]);
}

/** @deprecated Use {@link fetchReviewsForProfile}. */
export async function fetchReviewsForPetFriendProfile(
  supabase: SupabaseClient,
  profileId: string,
  limit = 20,
): Promise<ReviewDisplay[]> {
  return fetchReviewsForProfile(supabase, profileId, limit);
}

/** Pet experience notes from Pet Friends (friend → pet/parent). */
export async function fetchPetExperienceReviews(
  supabase: SupabaseClient,
  petId: string,
  limit = 12,
): Promise<ReviewDisplay[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("pet_id", petId)
    .eq("review_type", REVIEW_TYPE_FRIEND_PET)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }

  return enrichReviews(supabase, (data ?? []) as ReviewRow[]);
}

export function aggregatePetExperienceTags(reviews: ReviewDisplay[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const review of reviews) {
    for (const tag of review.tags) {
      const key = normalizeReviewTagKey(tag);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function formatReviewError(
  error: unknown,
  options?: { duplicateMessage?: string },
): string {
  if (isDuplicateReviewError(error)) {
    return (
      options?.duplicateMessage ??
      "You have already submitted a review for this booking."
    );
  }
  if (isPostgrestError(error)) {
    if (isMissingRelationError(error)) {
      return "Reviews are not set up yet. Run supabase/RUN_THIS_reviews_request_id.sql in the Supabase SQL Editor.";
    }
    const msg = formatSupabaseError(error);
    if (/request_id/i.test(msg) && /unique|duplicate/i.test(msg)) {
      return "Reviews could not be saved. Run supabase/RUN_THIS_reviews_two_per_booking.sql in the Supabase SQL Editor.";
    }
    if (/only allowed after|completed/i.test(msg)) {
      return "Reviews are only available after the booking is completed.";
    }
    return msg;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Could not submit review.";
}
