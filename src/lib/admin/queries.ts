import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminAuthUser,
  AdminBookingLite,
  AdminConversationLite,
  AdminMatchLite,
  AdminMembershipLite,
  AdminMessageLite,
  AdminPetLite,
  AdminProfileLite,
  AdminRequestLite,
} from "@/lib/admin/aggregates";
import type { AccessCodeRedemptionLite } from "@/lib/admin/overview";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import type { ProfileRole } from "@/lib/profile-setup";
import type { ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRow } from "@/lib/profile-utils";
import { isMissingColumnError, isMissingRelationError, isPostgrestError } from "@/lib/supabase-errors";

export type AdminCatalog = {
  profiles: AdminProfileLite[];
  authUsers: AdminAuthUser[];
  pets: AdminPetLite[];
  requests: AdminRequestLite[];
  bookings: AdminBookingLite[];
  conversations: AdminConversationLite[];
  messages: AdminMessageLite[];
  matches: AdminMatchLite[];
  memberships: AdminMembershipLite[];
  accessCodeRedemptions: AccessCodeRedemptionLite[];
  favorites: Array<{ id: string; user_id: string; pet_id: string | null; friend_profile_id: string | null; created_at: string }>;
  notifications: Array<{ id: string; user_id: string; type: string; created_at: string; read_at: string | null }>;
};

async function listAuthUsers(admin: NonNullable<ReturnType<typeof createAdminClient>>): Promise<AdminAuthUser[]> {
  const users: AdminAuthUser[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    const batch = data.users ?? [];
    for (const user of batch) {
      users.push({
        id: user.id,
        email: user.email ?? null,
        emailConfirmed: Boolean(user.email_confirmed_at),
        lastSignInAt: user.last_sign_in_at ?? null,
        createdAt: user.created_at ?? null,
      });
    }
    if (batch.length < 1000) break;
    page += 1;
  }
  return users;
}

const MEMBERSHIP_OVERVIEW_SELECT =
  "user_id, role, status, plan_id, plan_name, end_date, start_date, source, auto_renew, stripe_subscription_id, stripe_checkout_session_id, consumed_at";
const MEMBERSHIP_CORE_SELECT = "user_id, role, status, plan_id, end_date";

async function loadMembershipRows(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
): Promise<Record<string, unknown>[]> {
  const extended = await admin.from("user_memberships").select(MEMBERSHIP_OVERVIEW_SELECT);
  if (!extended.error) return (extended.data ?? []) as Record<string, unknown>[];
  if (isPostgrestError(extended.error) && isMissingColumnError(extended.error)) {
    const core = await admin.from("user_memberships").select(MEMBERSHIP_CORE_SELECT);
    return (core.data ?? []) as Record<string, unknown>[];
  }
  return (extended.data ?? []) as Record<string, unknown>[];
}

async function loadPets(admin: NonNullable<ReturnType<typeof createAdminClient>>) {
  const withDates = await admin.from("pets").select("id, owner_id, name, created_at, availability_dates");
  if (!withDates.error) return withDates.data ?? [];
  if (isPostgrestError(withDates.error) && isMissingColumnError(withDates.error, "availability_dates")) {
    const core = await admin.from("pets").select("id, owner_id, name, created_at");
    return core.data ?? [];
  }
  return withDates.data ?? [];
}

async function loadAccessCodeRedemptions(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
): Promise<AccessCodeRedemptionLite[]> {
  const [redemptionsRes, codesRes] = await Promise.all([
    admin.from("platform_access_code_redemptions").select("user_id, membership_role, plan_id, redeemed_at, code_id"),
    admin.from("platform_access_codes").select("id, code_normalized"),
  ]);
  if (redemptionsRes.error) {
    if (isPostgrestError(redemptionsRes.error) && isMissingRelationError(redemptionsRes.error)) return [];
    return [];
  }
  const codes = new Map(
    (codesRes.data ?? []).map((row) => [String(row.id), String(row.code_normalized ?? "")]),
  );
  return (redemptionsRes.data ?? []).map((row) => ({
    user_id: String(row.user_id),
    membership_role: String(row.membership_role),
    plan_id: String(row.plan_id ?? ""),
    redeemed_at: String(row.redeemed_at),
    code_normalized: codes.get(String(row.code_id)) || null,
  }));
}

export async function loadAdminCatalog(): Promise<AdminCatalog | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const [
    profilesRes,
    petsRows,
    requestsRes,
    bookingsRes,
    conversationsRes,
    messagesRes,
    matchesRes,
    membershipRows,
    accessCodeRedemptions,
    favoritesRes,
    notificationsRes,
    authUsers,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, display_name, role, active_mode, role_chosen_at, is_public, created_at, avatar_url, bio, location, public_location, city, country, google_place_id, latitude, longitude, phone, phone_e164, languages, details",
      ),
    loadPets(admin),
    admin
      .from("requests")
      .select("id, pet_id, pet_parent_id, pet_friend_id, sender_id, receiver_id, status, created_at, updated_at, date_from, date_to, requested_dates, responded_at"),
    admin
      .from("bookings")
      .select("id, request_id, pet_id, pet_parent_id, pet_friend_id, status, created_at, start_date, end_date, completed_at, cancelled_at"),
    admin.from("conversations").select("id, request_id, created_at"),
    admin.from("messages").select("id, conversation_id, sender_id, created_at"),
    admin
      .from("match_suggestions")
      .select("id, pet_parent_id, pet_friend_id, pet_id, score, reasons, status, created_at, viewed_at, clicked_at, emailed_at"),
    loadMembershipRows(admin),
    loadAccessCodeRedemptions(admin),
    admin.from("favorites").select("id, user_id, pet_id, friend_profile_id, created_at"),
    admin.from("notifications").select("id, user_id, type, created_at, read_at"),
    listAuthUsers(admin),
  ]);

  return {
    profiles: (profilesRes.data ?? []).map((row) => ({
      id: String(row.id),
      display_name: String(row.display_name ?? ""),
      role: (row.role as ProfileRole | null) ?? null,
      active_mode: (row.active_mode as ProfileActiveMode | null) ?? null,
      role_chosen_at: (row.role_chosen_at as string | null) ?? null,
      is_public: Boolean(row.is_public),
      created_at: String(row.created_at),
      avatar_url: (row.avatar_url as string | null) ?? null,
      bio: (row.bio as string | null) ?? null,
      location: (row.location as string | null) ?? null,
      public_location: (row.public_location as string | null) ?? null,
      city: (row.city as string | null) ?? null,
      country: (row.country as string | null) ?? null,
      google_place_id: (row.google_place_id as string | null) ?? null,
      latitude: (row.latitude as number | null) ?? null,
      longitude: (row.longitude as number | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      phone_e164: (row.phone_e164 as string | null) ?? null,
      languages: Array.isArray(row.languages) ? (row.languages as string[]) : [],
      details: (row.details as ProfileRow["details"] | null) ?? null,
    })),
    authUsers,
    pets: petsRows.map((row) => ({
      id: String(row.id),
      owner_id: String(row.owner_id),
      name: String(row.name ?? ""),
      created_at: row.created_at ? String(row.created_at) : undefined,
      availability_dates: normalizeAvailabilityDates(
        (row as { availability_dates?: unknown }).availability_dates,
      ),
    })),
    requests: (requestsRes.data ?? []) as AdminRequestLite[],
    bookings: (bookingsRes.data ?? []) as AdminBookingLite[],
    conversations: (conversationsRes.data ?? []) as AdminConversationLite[],
    messages: (messagesRes.data ?? []) as AdminMessageLite[],
    matches: (matchesRes.data ?? []).map((row) => ({
      id: String(row.id),
      pet_parent_id: String(row.pet_parent_id),
      pet_friend_id: String(row.pet_friend_id),
      pet_id: String(row.pet_id),
      score: Number(row.score ?? 0),
      reasons: row.reasons,
      status: String(row.status),
      created_at: String(row.created_at),
      viewed_at: (row.viewed_at as string | null) ?? null,
      clicked_at: (row.clicked_at as string | null) ?? null,
      emailed_at: (row.emailed_at as string | null) ?? null,
    })),
    memberships: membershipRows.map((row) => ({
      user_id: String(row.user_id),
      role: String(row.role),
      status: String(row.status),
      plan_id: row.plan_id == null ? null : String(row.plan_id),
      plan_name: row.plan_name == null ? null : String(row.plan_name),
      end_date: row.end_date == null ? null : String(row.end_date),
      start_date: row.start_date == null ? null : String(row.start_date),
      source: row.source == null ? null : String(row.source),
      auto_renew: typeof row.auto_renew === "boolean" ? row.auto_renew : null,
      stripe_subscription_id: row.stripe_subscription_id == null ? null : String(row.stripe_subscription_id),
      stripe_checkout_session_id:
        row.stripe_checkout_session_id == null ? null : String(row.stripe_checkout_session_id),
      consumed_at: row.consumed_at == null ? null : String(row.consumed_at),
    })),
    accessCodeRedemptions,
    favorites: (favoritesRes.data ?? []) as AdminCatalog["favorites"],
    notifications: (notificationsRes.data ?? []) as AdminCatalog["notifications"],
  };
}

export async function loadActivityEventsInRange() {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("user_activity_events")
    .select("user_id, event_type, entity_type, entity_id, page_path, created_at")
    .order("created_at", { ascending: false })
    .limit(8000);
  return (data ?? []).map((row) => ({
    user_id: (row.user_id as string | null) ?? null,
    event_type: String(row.event_type),
    entity_type: (row.entity_type as string | null) ?? null,
    entity_id: (row.entity_id as string | null) ?? null,
    page_path: (row.page_path as string | null) ?? null,
    created_at: String(row.created_at),
  }));
}

export async function loadActivityEvents(page: number, pageSize: number) {
  const admin = createAdminClient();
  if (!admin) return { items: [], total: 0 };
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count } = await admin
    .from("user_activity_events")
    .select("id, user_id, event_type, entity_type, entity_id, page_path, session_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  return { items: data ?? [], total: count ?? 0 };
}
