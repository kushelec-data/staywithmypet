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
import type { ProfileRole } from "@/lib/profile-setup";
import type { ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRow } from "@/lib/profile-utils";

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

export async function loadAdminCatalog(): Promise<AdminCatalog | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const [
    profilesRes,
    petsRes,
    requestsRes,
    bookingsRes,
    conversationsRes,
    messagesRes,
    matchesRes,
    membershipsRes,
    favoritesRes,
    notificationsRes,
    authUsers,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, display_name, role, active_mode, role_chosen_at, is_public, created_at, avatar_url, bio, location, public_location, city, country, google_place_id, latitude, longitude, phone, phone_e164, languages, details",
      ),
    admin.from("pets").select("id, owner_id, name"),
    admin
      .from("requests")
      .select("id, pet_id, pet_parent_id, pet_friend_id, sender_id, receiver_id, status, created_at, updated_at, date_from, date_to, requested_dates"),
    admin
      .from("bookings")
      .select("id, request_id, pet_id, pet_parent_id, pet_friend_id, status, created_at, start_date, end_date, completed_at"),
    admin.from("conversations").select("id, request_id, created_at"),
    admin.from("messages").select("id, conversation_id, sender_id, created_at"),
    admin
      .from("match_suggestions")
      .select("id, pet_parent_id, pet_friend_id, pet_id, score, reasons, status, created_at, viewed_at, clicked_at, emailed_at"),
    admin.from("user_memberships").select("user_id, role, status, plan_id, end_date"),
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
    pets: (petsRes.data ?? []).map((row) => ({
      id: String(row.id),
      owner_id: String(row.owner_id),
      name: String(row.name ?? ""),
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
    memberships: (membershipsRes.data ?? []) as AdminMembershipLite[],
    favorites: (favoritesRes.data ?? []) as AdminCatalog["favorites"],
    notifications: (notificationsRes.data ?? []) as AdminCatalog["notifications"],
  };
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
