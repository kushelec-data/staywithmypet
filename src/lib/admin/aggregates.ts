import { deriveAdminFunnelStage, deriveInteractionLevel, type AdminFunnelStage, type InteractionLevel } from "@/lib/admin/metrics";
import { isProfileIncomplete } from "@/lib/profile-utils";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import type { ProfileRole } from "@/lib/profile-setup";
import { resolveActiveMode, type ProfileActiveMode } from "@/lib/profile-mode";
import type { ProfileRow } from "@/lib/profile-utils";

export const ADMIN_PAGE_SIZE = 50;

export type AdminAuthUser = {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  lastSignInAt: string | null;
  createdAt: string | null;
};

export type AdminProfileLite = {
  id: string;
  display_name: string;
  role: ProfileRole | null;
  active_mode: ProfileActiveMode | null;
  role_chosen_at: string | null;
  is_public: boolean;
  created_at: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  public_location: string | null;
  city: string | null;
  country: string | null;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  phone_e164: string | null;
  languages: string[];
  details: ProfileRow["details"] | null;
};

export type AdminRequestLite = {
  id: string;
  pet_id: string;
  pet_parent_id: string;
  pet_friend_id: string;
  sender_id?: string | null;
  receiver_id?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  date_from?: string | null;
  date_to?: string | null;
  requested_dates?: string[] | null;
};

export type AdminBookingLite = {
  id: string;
  request_id: string | null;
  pet_id: string;
  pet_parent_id: string;
  pet_friend_id: string;
  status: string;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  completed_at: string | null;
};

export type AdminConversationLite = {
  id: string;
  request_id: string;
  created_at: string;
};

export type AdminMessageLite = {
  id: string;
  conversation_id: string;
  sender_id: string;
  created_at: string;
};

export type AdminMatchLite = {
  id: string;
  pet_parent_id: string;
  pet_friend_id: string;
  pet_id: string;
  score: number;
  reasons: unknown;
  status: string;
  created_at: string;
  viewed_at: string | null;
  clicked_at: string | null;
  emailed_at: string | null;
};

export type AdminMembershipLite = {
  user_id: string;
  role: string;
  status: string;
  plan_id: string | null;
  end_date: string | null;
};

export type AdminPetLite = {
  id: string;
  owner_id: string;
  name: string;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string | null;
  signupDate: string | null;
  lastLogin: string | null;
  role: string;
  currentMode: string;
  roleChosen: boolean;
  profilePublic: boolean;
  profileCompletion: number;
  marketplaceReady: boolean;
  petCount: number;
  membershipStatus: string;
  requestsSent: number;
  requestsReceived: number;
  messagesSent: number;
  conversations: number;
  bookings: number;
  completedBookings: number;
  matchesReceived: number;
  lastMeaningfulActivity: string | null;
  funnelStage: AdminFunnelStage;
};

export type AdminUserListFilters = {
  q?: string;
  role?: "pet_parent" | "pet_friend" | "both" | "not_chosen";
  profileIncomplete?: boolean;
  isPublic?: boolean | null;
  hasRequests?: boolean | null;
  hasMessages?: boolean | null;
  hasBookings?: boolean | null;
  hasMatches?: boolean | null;
  signupFrom?: string;
  signupTo?: string;
  lastActiveFrom?: string;
  lastActiveTo?: string;
};

function countBy(ids: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const id of ids) map.set(id, (map.get(id) ?? 0) + 1);
  return map;
}

function maxIso(values: Array<string | null | undefined>): string | null {
  const times = values.filter((v): v is string => Boolean(v));
  if (times.length === 0) return null;
  return times.reduce((a, b) => (a > b ? a : b));
}

export function membershipLabelForUser(
  userId: string,
  memberships: AdminMembershipLite[],
): string {
  const rows = memberships.filter((row) => row.user_id === userId);
  if (rows.length === 0) return "none";
  return rows
    .map((row) => `${row.role}:${row.status}${row.plan_id ? ` (${row.plan_id})` : ""}`)
    .join("; ");
}

export function buildAdminUserRows(input: {
  profiles: AdminProfileLite[];
  authUsers: AdminAuthUser[];
  pets: AdminPetLite[];
  requests: AdminRequestLite[];
  bookings: AdminBookingLite[];
  conversations: AdminConversationLite[];
  messages: AdminMessageLite[];
  matches: AdminMatchLite[];
  memberships: AdminMembershipLite[];
}): AdminUserRow[] {
  const authById = new Map(input.authUsers.map((u) => [u.id, u]));
  const petsByOwner = countBy(input.pets.map((p) => p.owner_id));
  const requestsSentBy = countBy(
    input.requests.map((r) => r.sender_id || r.pet_friend_id),
  );
  const requestsReceivedBy = countBy(
    input.requests.map((r) => r.receiver_id || r.pet_parent_id),
  );

  const convByRequest = new Map(input.conversations.map((c) => [c.request_id, c]));
  const convParticipants = new Map<string, Set<string>>();
  for (const conv of input.conversations) {
    const req = input.requests.find((r) => r.id === conv.request_id);
    if (!req) continue;
    if (!convParticipants.has(req.pet_parent_id)) convParticipants.set(req.pet_parent_id, new Set());
    if (!convParticipants.has(req.pet_friend_id)) convParticipants.set(req.pet_friend_id, new Set());
    convParticipants.get(req.pet_parent_id)!.add(conv.id);
    convParticipants.get(req.pet_friend_id)!.add(conv.id);
  }

  const messagesSent = countBy(input.messages.map((m) => m.sender_id));
  const bookingsByUser = new Map<string, AdminBookingLite[]>();
  for (const b of input.bookings) {
    for (const uid of [b.pet_parent_id, b.pet_friend_id]) {
      const list = bookingsByUser.get(uid) ?? [];
      list.push(b);
      bookingsByUser.set(uid, list);
    }
  }
  const matchesByUser = new Map<string, number>();
  for (const m of input.matches) {
    matchesByUser.set(m.pet_parent_id, (matchesByUser.get(m.pet_parent_id) ?? 0) + 1);
    matchesByUser.set(m.pet_friend_id, (matchesByUser.get(m.pet_friend_id) ?? 0) + 1);
  }

  return input.profiles.map((profile) => {
    const auth = authById.get(profile.id);
    const completeness = computeProfileCompleteness(
      {
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        location: profile.location,
        public_location: profile.public_location,
        city: profile.city,
        country: profile.country,
        google_place_id: profile.google_place_id,
        latitude: profile.latitude,
        longitude: profile.longitude,
        phone: profile.phone,
        phone_e164: profile.phone_e164,
        role: (profile.role ?? "pet_friend") as ProfileRole,
        active_mode: (profile.active_mode ?? "pet_friend") as ProfileActiveMode,
        details: profile.details ?? ({} as ProfileRow["details"]),
        display_name: profile.display_name,
        languages: profile.languages,
        is_public: profile.is_public,
      },
      { petsCount: petsByOwner.get(profile.id) ?? 0, petIntros: [] },
    );
    const roleChosen = Boolean(profile.role_chosen_at);
    const incomplete = isProfileIncomplete(
      {
        ...({} as ProfileRow),
        display_name: profile.display_name,
        bio: profile.bio,
        location: profile.location,
        languages: profile.languages,
      },
      auth?.email,
    );
    const userBookings = bookingsByUser.get(profile.id) ?? [];
    const completedBookings = userBookings.filter((b) => b.status === "completed").length;
    const pendingSent = input.requests.some(
      (r) => r.status === "pending" && (r.pet_parent_id === profile.id || r.pet_friend_id === profile.id),
    );
    const reqSent = requestsSentBy.get(profile.id) ?? 0;
    const reqRecv = requestsReceivedBy.get(profile.id) ?? 0;
    const msgSent = messagesSent.get(profile.id) ?? 0;
    const lastMeaningfulActivity = maxIso([
      ...input.requests.filter((r) => r.pet_parent_id === profile.id || r.pet_friend_id === profile.id).map((r) => r.updated_at || r.created_at),
      ...input.messages.filter((m) => m.sender_id === profile.id).map((m) => m.created_at),
      ...userBookings.map((b) => b.created_at),
    ]);
    const funnelStage = deriveAdminFunnelStage({
      emailConfirmed: auth?.emailConfirmed ?? false,
      roleChosen,
      profileComplete: !incomplete,
      wantsPets: profile.role === "pet_parent" || profile.role === "both",
      petCount: petsByOwner.get(profile.id) ?? 0,
      requestsSent: reqSent,
      requestsReceived: reqRecv,
      pendingSent,
      messagesSent: msgSent,
      bookings: userBookings.length,
      completedBookings,
    });

    return {
      id: profile.id,
      name: profile.display_name,
      email: auth?.email ?? null,
      signupDate: auth?.createdAt ?? profile.created_at,
      lastLogin: auth?.lastSignInAt ?? null,
      role: profile.role ?? "—",
      currentMode: profile.active_mode ? resolveActiveMode(profile.role ?? "pet_friend", profile.active_mode) : "—",
      roleChosen,
      profilePublic: profile.is_public,
      profileCompletion: completeness.percent,
      marketplaceReady: completeness.marketplaceReady,
      petCount: petsByOwner.get(profile.id) ?? 0,
      membershipStatus: membershipLabelForUser(profile.id, input.memberships),
      requestsSent: reqSent,
      requestsReceived: reqRecv,
      messagesSent: msgSent,
      conversations: convParticipants.get(profile.id)?.size ?? 0,
      bookings: userBookings.length,
      completedBookings,
      matchesReceived: matchesByUser.get(profile.id) ?? 0,
      lastMeaningfulActivity,
      funnelStage,
    };
  });
}

export function filterAdminUserRows(rows: AdminUserRow[], filters: AdminUserListFilters): AdminUserRow[] {
  const q = filters.q?.trim().toLowerCase() ?? "";
  return rows.filter((row) => {
    if (q && !row.name.toLowerCase().includes(q) && !(row.email ?? "").toLowerCase().includes(q)) return false;
    if (filters.role === "not_chosen" && row.roleChosen) return false;
    if (filters.role && filters.role !== "not_chosen" && row.role !== filters.role) return false;
    if (filters.profileIncomplete === true && row.profileCompletion >= 100) return false;
    if (filters.profileIncomplete === false && row.profileCompletion < 100) return false;
    if (filters.isPublic === true && !row.profilePublic) return false;
    if (filters.isPublic === false && row.profilePublic) return false;
    if (filters.hasRequests === true && row.requestsSent + row.requestsReceived === 0) return false;
    if (filters.hasRequests === false && row.requestsSent + row.requestsReceived > 0) return false;
    if (filters.hasMessages === true && row.messagesSent === 0) return false;
    if (filters.hasMessages === false && row.messagesSent > 0) return false;
    if (filters.hasBookings === true && row.bookings === 0) return false;
    if (filters.hasBookings === false && row.bookings > 0) return false;
    if (filters.hasMatches === true && row.matchesReceived === 0) return false;
    if (filters.hasMatches === false && row.matchesReceived > 0) return false;
    if (filters.signupFrom && (row.signupDate ?? "") < filters.signupFrom) return false;
    if (filters.signupTo && (row.signupDate ?? "") > `${filters.signupTo}T23:59:59`) return false;
    if (filters.lastActiveFrom && (row.lastMeaningfulActivity ?? "") < filters.lastActiveFrom) return false;
    if (filters.lastActiveTo && (row.lastMeaningfulActivity ?? "") > `${filters.lastActiveTo}T23:59:59`) return false;
    return true;
  });
}

export function paginateRows<T>(rows: T[], page: number, pageSize = ADMIN_PAGE_SIZE): { items: T[]; total: number; page: number; pageSize: number } {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return { items: rows.slice(start, start + pageSize), total: rows.length, page: safePage, pageSize };
}

export function overviewFromUserRows(
  rows: AdminUserRow[],
  extras: {
    requests: AdminRequestLite[];
    messages: AdminMessageLite[];
    conversations: AdminConversationLite[];
    bookings: AdminBookingLite[];
    matches: AdminMatchLite[];
    now?: Date;
  },
) {
  const now = extras.now ?? new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const pendingRequests = extras.requests.filter((r) => r.status === "pending").length;
  const activeBookings = extras.bookings.filter((b) => b.status === "upcoming" || b.status === "active").length;
  const completedBookings = extras.bookings.filter((b) => b.status === "completed").length;
  return {
    totalUsers: rows.length,
    newUsers7d: rows.filter((r) => (r.signupDate ?? "") >= d7).length,
    newUsers30d: rows.filter((r) => (r.signupDate ?? "") >= d30).length,
    roleNotChosen: rows.filter((r) => !r.roleChosen).length,
    profileIncomplete: rows.filter((r) => r.profileCompletion < 100).length,
    readyUsers: rows.filter((r) => r.marketplaceReady).length,
    requests: extras.requests.length,
    pendingRequests,
    messages: extras.messages.length,
    conversations: extras.conversations.length,
    bookings: extras.bookings.length,
    activeBookings,
    completedBookings,
    matchSuggestions: extras.matches.length,
  };
}

export const FUNNEL_STEPS = [
  "Signed up",
  "Email confirmed",
  "Role chosen",
  "Profile complete",
  "Marketplace ready",
  "Request",
  "Conversation",
  "Booking",
  "Completed booking",
] as const;

export function funnelCounts(rows: AdminUserRow[], authUsers: AdminAuthUser[]) {
  const confirmed = new Set(authUsers.filter((u) => u.emailConfirmed).map((u) => u.id));
  const signedUp = rows.length || 1;
  const pct = (n: number) => Math.round((n / signedUp) * 1000) / 10;
  const counts = {
    "Signed up": rows.length,
    "Email confirmed": rows.filter((r) => confirmed.has(r.id)).length,
    "Role chosen": rows.filter((r) => r.roleChosen).length,
    "Profile complete": rows.filter((r) => r.profileCompletion >= 100).length,
    "Marketplace ready": rows.filter((r) => r.marketplaceReady).length,
    Request: rows.filter((r) => r.requestsSent + r.requestsReceived > 0).length,
    Conversation: rows.filter((r) => r.conversations > 0).length,
    Booking: rows.filter((r) => r.bookings > 0).length,
    "Completed booking": rows.filter((r) => r.completedBookings > 0).length,
  };
  return FUNNEL_STEPS.map((step) => ({
    step,
    count: counts[step],
    percent: pct(counts[step]),
  }));
}

export type RelationshipRow = {
  petParentId: string;
  petFriendId: string;
  petParentName: string;
  petFriendName: string;
  petsInvolved: string[];
  requests: number;
  acceptedRequests: number;
  declinedOrCancelled: number;
  conversations: number;
  messageCount: number;
  bookings: number;
  completedBookings: number;
  firstInteraction: string | null;
  lastInteraction: string | null;
  interactionLevel: InteractionLevel;
};

export function buildRelationshipRows(input: {
  profiles: AdminProfileLite[];
  pets: AdminPetLite[];
  requests: AdminRequestLite[];
  bookings: AdminBookingLite[];
  conversations: AdminConversationLite[];
  messages: AdminMessageLite[];
}): RelationshipRow[] {
  const names = new Map(input.profiles.map((p) => [p.id, p.display_name]));
  const petNames = new Map(input.pets.map((p) => [p.id, p.name]));
  const convByRequest = new Map(input.conversations.map((c) => [c.request_id, c]));
  const msgByConv = countBy(input.messages.map((m) => m.conversation_id));
  const pairs = new Map<string, RelationshipRow>();

  const ensure = (parentId: string, friendId: string): RelationshipRow => {
    const key = `${parentId}:${friendId}`;
    const existing = pairs.get(key);
    if (existing) return existing;
    const row: RelationshipRow = {
      petParentId: parentId,
      petFriendId: friendId,
      petParentName: names.get(parentId) ?? parentId,
      petFriendName: names.get(friendId) ?? friendId,
      petsInvolved: [],
      requests: 0,
      acceptedRequests: 0,
      declinedOrCancelled: 0,
      conversations: 0,
      messageCount: 0,
      bookings: 0,
      completedBookings: 0,
      firstInteraction: null,
      lastInteraction: null,
      interactionLevel: "Very Low",
    };
    pairs.set(key, row);
    return row;
  };

  const touch = (row: RelationshipRow, at: string, petId?: string) => {
    if (petId && petNames.get(petId) && !row.petsInvolved.includes(petNames.get(petId)!)) {
      row.petsInvolved.push(petNames.get(petId)!);
    }
    row.firstInteraction = row.firstInteraction && row.firstInteraction < at ? row.firstInteraction : at;
    row.lastInteraction = row.lastInteraction && row.lastInteraction > at ? row.lastInteraction : at;
  };

  for (const req of input.requests) {
    const row = ensure(req.pet_parent_id, req.pet_friend_id);
    row.requests += 1;
    if (req.status === "accepted" || req.status === "completed") row.acceptedRequests += 1;
    if (req.status === "declined" || req.status === "cancelled") row.declinedOrCancelled += 1;
    const conv = convByRequest.get(req.id);
    if (conv) {
      row.conversations += 1;
      row.messageCount += msgByConv.get(conv.id) ?? 0;
      touch(row, conv.created_at, req.pet_id);
    }
    touch(row, req.created_at, req.pet_id);
  }

  for (const booking of input.bookings) {
    const row = ensure(booking.pet_parent_id, booking.pet_friend_id);
    row.bookings += 1;
    if (booking.status === "completed") row.completedBookings += 1;
    touch(row, booking.created_at, booking.pet_id);
  }

  for (const conv of input.conversations) {
    const req = input.requests.find((r) => r.id === conv.request_id);
    if (!req) continue;
    const row = ensure(req.pet_parent_id, req.pet_friend_id);
    if (row.conversations === 0) {
      row.conversations += 1;
      row.messageCount += msgByConv.get(conv.id) ?? 0;
    }
    touch(row, conv.created_at, req.pet_id);
  }

  for (const row of pairs.values()) {
    row.interactionLevel = deriveInteractionLevel({
      completedBookings: row.completedBookings,
      bookings: row.bookings,
      messages: row.messageCount,
      requests: row.requests,
      conversations: row.conversations,
    });
  }

  return [...pairs.values()].sort((a, b) => (b.lastInteraction ?? "").localeCompare(a.lastInteraction ?? ""));
}

export type AdminTimelineEvent = {
  at: string;
  label: string;
};

export function buildUserTimeline(input: {
  userId: string;
  profiles: AdminProfileLite[];
  pets: AdminPetLite[];
  requests: AdminRequestLite[];
  bookings: AdminBookingLite[];
  conversations: AdminConversationLite[];
  messages: AdminMessageLite[];
  matches: AdminMatchLite[];
  favorites: Array<{ user_id: string; created_at: string }>;
  notifications: Array<{ user_id: string; type: string; created_at: string }>;
}): AdminTimelineEvent[] {
  const names = new Map(input.profiles.map((p) => [p.id, p.display_name]));
  const pets = new Map(input.pets.map((p) => [p.id, p.name]));
  const events: AdminTimelineEvent[] = [];
  for (const req of input.requests.filter((r) => r.pet_parent_id === input.userId || r.pet_friend_id === input.userId)) {
    const other = req.pet_parent_id === input.userId ? req.pet_friend_id : req.pet_parent_id;
    const pet = pets.get(req.pet_id) ?? "pet";
    events.push({
      at: req.created_at,
      label: `Request ${req.status} with ${names.get(other) ?? "user"} for ${pet}`,
    });
  }
  for (const conv of input.conversations) {
    const req = input.requests.find((r) => r.id === conv.request_id);
    if (!req || (req.pet_parent_id !== input.userId && req.pet_friend_id !== input.userId)) continue;
    const other = req.pet_parent_id === input.userId ? req.pet_friend_id : req.pet_parent_id;
    events.push({ at: conv.created_at, label: `Conversation created with ${names.get(other) ?? "user"}` });
  }
  const convIds = new Set(
    input.conversations
      .filter((c) => {
        const req = input.requests.find((r) => r.id === c.request_id);
        return req && (req.pet_parent_id === input.userId || req.pet_friend_id === input.userId);
      })
      .map((c) => c.id),
  );
  const sent = input.messages.filter((m) => m.sender_id === input.userId && convIds.has(m.conversation_id));
  for (const msg of sent) {
    events.push({ at: msg.created_at, label: "Message sent" });
  }
  for (const booking of input.bookings.filter((b) => b.pet_parent_id === input.userId || b.pet_friend_id === input.userId)) {
    events.push({
      at: booking.created_at,
      label: `Booking ${booking.status} created`,
    });
    if (booking.completed_at) {
      events.push({ at: booking.completed_at, label: "Booking completed" });
    }
  }
  for (const match of input.matches.filter((m) => m.pet_parent_id === input.userId || m.pet_friend_id === input.userId)) {
    events.push({ at: match.created_at, label: "Match suggestion received" });
  }
  for (const fav of input.favorites.filter((f) => f.user_id === input.userId)) {
    events.push({ at: fav.created_at, label: "Favourite saved" });
  }
  for (const n of input.notifications.filter((f) => f.user_id === input.userId)) {
    events.push({ at: n.created_at, label: `Notification: ${n.type}` });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}

export function matchAttribution(input: {
  matches: AdminMatchLite[];
  requests: AdminRequestLite[];
  bookings: AdminBookingLite[];
}) {
  let viewed = 0;
  let clicked = 0;
  let emailed = 0;
  let dismissed = 0;
  let withLaterRequest = 0;
  let withLaterBooking = 0;
  let withLaterCompletedBooking = 0;
  const users = new Set<string>();

  const rows = input.matches.map((match) => {
    users.add(match.pet_parent_id);
    users.add(match.pet_friend_id);
    if (match.viewed_at || match.status === "viewed") viewed += 1;
    if (match.clicked_at) clicked += 1;
    if (match.emailed_at) emailed += 1;
    if (match.status === "dismissed") dismissed += 1;
    const laterRequests = input.requests.filter(
      (r) =>
        r.pet_parent_id === match.pet_parent_id &&
        r.pet_friend_id === match.pet_friend_id &&
        r.pet_id === match.pet_id &&
        r.created_at > match.created_at,
    );
    const laterBookings = input.bookings.filter(
      (b) =>
        b.pet_parent_id === match.pet_parent_id &&
        b.pet_friend_id === match.pet_friend_id &&
        b.pet_id === match.pet_id &&
        b.created_at > match.created_at,
    );
    const laterCompleted = laterBookings.filter((b) => b.status === "completed");
    if (laterRequests.length) withLaterRequest += 1;
    if (laterBookings.length) withLaterBooking += 1;
    if (laterCompleted.length) withLaterCompletedBooking += 1;
    return {
      ...match,
      viewed: Boolean(match.viewed_at || match.status === "viewed"),
      clicked: Boolean(match.clicked_at),
      dismissed: match.status === "dismissed",
      emailed: Boolean(match.emailed_at),
      requestAfter: laterRequests.length > 0,
      bookingAfter: laterBookings.length > 0,
      completedAfter: laterCompleted.length > 0,
    };
  });

  return {
    rows,
    summary: {
      generated: input.matches.length,
      usersReceiving: users.size,
      viewed,
      clicked,
      emailed,
      dismissed,
      withLaterRequest,
      withLaterBooking,
      withLaterCompletedBooking,
    },
  };
}

export function jsonHasForbiddenFields(payload: unknown): boolean {
  const text = JSON.stringify(payload);
  const banned = ["service_role", "password", "recovery_token", "access_token", "refresh_token", "body"];
  return banned.some((key) => text.includes(`"${key}"`));
}
