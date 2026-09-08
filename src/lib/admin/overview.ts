import {
  membershipPlanLabel,
  membershipPlanPrice,
  PLAN_BILLING_INTERVAL,
  isMembershipActive,
  type MembershipRole,
  type UserMembership,
} from "@/lib/membership";
import { bucketKey, funnelConversions, periodChange, type PeriodChange } from "@/lib/admin/analytics";
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
  AdminUserRow,
} from "@/lib/admin/aggregates";

export const OVERVIEW_RANGES = ["1d", "7d", "30d"] as const;
export type OverviewRange = (typeof OVERVIEW_RANGES)[number];

export const OVERVIEW_RANGE_LABELS: Record<OverviewRange, string> = {
  "1d": "Today",
  "7d": "7 Days",
  "30d": "30 Days",
};

export const OVERVIEW_CHART_METRICS = [
  "active_users",
  "signups",
  "requests",
  "messages",
  "bookings",
  "payments",
] as const;
export type OverviewChartMetric = (typeof OVERVIEW_CHART_METRICS)[number];

export const OVERVIEW_CHART_LABELS: Record<OverviewChartMetric, string> = {
  active_users: "Active users",
  signups: "Signups",
  requests: "Requests",
  messages: "Messages",
  bookings: "Bookings",
  payments: "Payments",
};

export const STALE_PENDING_REQUEST_DAYS = 3;
export const OVERVIEW_FEED_LIMIT = 12;
export const OVERVIEW_TABLE_LIMIT = 5;
export const OVERVIEW_ATTENTION_LIMIT = 5;

export type MembershipChannel = "paid" | "access_code" | "manual" | "unknown";

const PAID_SOURCES = new Set(["stripe_checkout", "stripe_subscription", "stripe"]);
const ACCESS_SOURCES = new Set(["platform_access_code", "test_code", "access_code"]);
const MANUAL_SOURCES = new Set(["manual", "admin", "admin/manual"]);

export function parseOverviewRange(raw: string | null | undefined): OverviewRange {
  if (raw === "1d" || raw === "30d") return raw;
  return "7d";
}

export function parseOverviewMetric(raw: string | null | undefined): OverviewChartMetric {
  if (OVERVIEW_CHART_METRICS.includes(raw as OverviewChartMetric)) {
    return raw as OverviewChartMetric;
  }
  return "active_users";
}

export function catalogPriceToEuros(price: string | null | undefined): number | null {
  if (!price) return null;
  const n = Number(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function formatEuro(amount: number): string {
  return `€${amount}`;
}

export function maskAccessCode(code: string | null | undefined): string | null {
  if (!code?.trim()) return null;
  const normalized = code.trim().toUpperCase();
  if (normalized.length <= 3) return "***";
  const keep = Math.min(7, Math.max(1, normalized.length - 3));
  return `${normalized.slice(0, keep)}***`;
}

export function classifyMembershipChannel(row: {
  source?: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_subscription_id?: string | null;
}): MembershipChannel {
  const source = row.source?.trim().toLowerCase() ?? "";
  if (ACCESS_SOURCES.has(source)) return "access_code";
  if (MANUAL_SOURCES.has(source)) return "manual";
  if (PAID_SOURCES.has(source)) return "paid";
  const hasStripeId = Boolean(row.stripe_checkout_session_id?.trim() || row.stripe_subscription_id?.trim());
  if (hasStripeId) return "paid";
  return "unknown";
}

export function membershipBillingKind(planId: string | null | undefined): "subscription" | "one_time" | "unknown" {
  if (!planId) return "unknown";
  const interval = PLAN_BILLING_INTERVAL[planId];
  if (interval === "one_time") return "one_time";
  if (interval === "3_months" || interval === "12_months") return "subscription";
  return "unknown";
}

function asUserMembership(row: AdminMembershipLite): UserMembership {
  return {
    id: `${row.user_id}:${row.role}`,
    user_id: row.user_id,
    role: (row.role === "pet_parent" ? "pet_parent" : "pet_friend") as MembershipRole,
    plan_id: row.plan_id ?? "",
    plan_name: row.plan_name ?? null,
    status: row.status as UserMembership["status"],
    start_date: row.start_date ?? "",
    end_date: row.end_date,
    auto_renew: Boolean(row.auto_renew),
    linked_booking_id: null,
    consumed_at: row.consumed_at ?? null,
    cancellation_restart_used: false,
    stripe_customer_id: null,
    stripe_subscription_id: row.stripe_subscription_id ?? null,
    stripe_price_id: null,
    stripe_checkout_session_id: row.stripe_checkout_session_id ?? null,
  };
}

export function membershipRowIsActive(row: AdminMembershipLite, now = new Date()): boolean {
  return isMembershipActive(asUserMembership(row), now);
}

export function membershipActivatedAt(row: AdminMembershipLite): string | null {
  return row.start_date ?? null;
}

export function paidRevenueEuros(row: AdminMembershipLite): number {
  if (classifyMembershipChannel(row) !== "paid") return 0;
  return catalogPriceToEuros(membershipPlanPrice(row.plan_id ?? "")) ?? 0;
}

export type AccessCodeRedemptionLite = {
  user_id: string;
  membership_role: string;
  plan_id: string;
  redeemed_at: string;
  code_normalized: string | null;
};

export function redemptionForMembership(
  row: AdminMembershipLite,
  redemptions: AccessCodeRedemptionLite[],
): AccessCodeRedemptionLite | null {
  const matches = redemptions.filter(
    (r) => r.user_id === row.user_id && r.membership_role === row.role,
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.redeemed_at.localeCompare(a.redeemed_at))[0] ?? null;
}

export function roleLabel(role: string | null | undefined): string {
  if (role === "pet_parent") return "Pet Parent";
  if (role === "pet_friend") return "Pet Friend";
  if (role === "both") return "Both";
  return role?.trim() || "—";
}

export type RecentMemberRow = {
  userId: string;
  name: string;
  email: string | null;
  role: string;
  plan: string;
  amount: string | null;
  paymentType: string;
  activated: string | null;
  status: string;
  accessCodeDisplay: string | null;
  expiry: string | null;
};

function memberDisplay(
  row: AdminMembershipLite,
  names: Map<string, string>,
  emails: Map<string, string | null>,
  redemptions: AccessCodeRedemptionLite[],
): RecentMemberRow {
  const channel = classifyMembershipChannel(row);
  const plan =
    membershipPlanLabel(asUserMembership(row)) ??
    (row.plan_id?.trim() ? row.plan_id : "—");
  const amount = channel === "paid" ? membershipPlanPrice(row.plan_id ?? "") : null;
  const redemption = channel === "access_code" ? redemptionForMembership(row, redemptions) : null;
  const accessCodeDisplay =
    channel === "access_code"
      ? maskAccessCode(redemption?.code_normalized) ?? "Access code"
      : null;
  return {
    userId: row.user_id,
    name: names.get(row.user_id) ?? "Member",
    email: emails.get(row.user_id) ?? null,
    role: roleLabel(row.role),
    plan,
    amount,
    paymentType: channel === "paid" ? "Paid / Stripe" : channel === "access_code" ? "Access code" : channel === "manual" ? "Admin / manual" : "Unknown",
    activated: membershipActivatedAt(row),
    status: row.status,
    accessCodeDisplay,
    expiry: row.end_date,
  };
}

export function recentPaidMembers(
  memberships: AdminMembershipLite[],
  names: Map<string, string>,
  emails: Map<string, string | null>,
  limit = OVERVIEW_TABLE_LIMIT,
): RecentMemberRow[] {
  return memberships
    .filter((row) => classifyMembershipChannel(row) === "paid")
    .sort((a, b) => (membershipActivatedAt(b) ?? "").localeCompare(membershipActivatedAt(a) ?? ""))
    .slice(0, limit)
    .map((row) => memberDisplay(row, names, emails, []));
}

export function recentAccessCodeMembers(
  memberships: AdminMembershipLite[],
  redemptions: AccessCodeRedemptionLite[],
  names: Map<string, string>,
  emails: Map<string, string | null>,
  limit = OVERVIEW_TABLE_LIMIT,
): RecentMemberRow[] {
  return memberships
    .filter((row) => classifyMembershipChannel(row) === "access_code")
    .sort((a, b) => (membershipActivatedAt(b) ?? "").localeCompare(membershipActivatedAt(a) ?? ""))
    .slice(0, limit)
    .map((row) => memberDisplay(row, names, emails, redemptions));
}

export function membershipsInWindow(
  memberships: AdminMembershipLite[],
  start: Date,
  end: Date,
): AdminMembershipLite[] {
  return memberships.filter((row) => {
    const at = membershipActivatedAt(row);
    if (!at) return false;
    const t = new Date(at).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
}

export function sumPaidRevenue(rows: AdminMembershipLite[]): { euros: number; unknownPlans: number } {
  let euros = 0;
  let unknownPlans = 0;
  for (const row of rows) {
    if (classifyMembershipChannel(row) !== "paid") continue;
    const amount = catalogPriceToEuros(membershipPlanPrice(row.plan_id ?? ""));
    if (amount == null) unknownPlans += 1;
    else euros += amount;
  }
  return { euros, unknownPlans };
}

export function membershipSnapshot(
  memberships: AdminMembershipLite[],
  start: Date,
  end: Date,
  now = new Date(),
) {
  const paid = memberships.filter((row) => classifyMembershipChannel(row) === "paid");
  const access = memberships.filter((row) => classifyMembershipChannel(row) === "access_code");
  const active = memberships.filter((row) => membershipRowIsActive(row, now));
  const period = membershipsInWindow(memberships, start, end);
  const periodPaid = period.filter((row) => classifyMembershipChannel(row) === "paid");
  const periodAccess = period.filter((row) => classifyMembershipChannel(row) === "access_code");
  const revenue = sumPaidRevenue(periodPaid);
  const activePaid = active.filter((row) => classifyMembershipChannel(row) === "paid");
  const subscriptions = activePaid.filter((row) => membershipBillingKind(row.plan_id) === "subscription").length;
  const oneTime = activePaid.filter((row) => membershipBillingKind(row.plan_id) === "one_time").length;
  return {
    paidMemberships: paid.length,
    accessCodeMemberships: access.length,
    unclassifiedMemberships: memberships.filter((row) => classifyMembershipChannel(row) === "unknown").length,
    activeMemberships: active.length,
    newPaidThisPeriod: periodPaid.length,
    newAccessCodeThisPeriod: periodAccess.length,
    revenueThisPeriod: revenue.euros,
    unknownPaidPlansThisPeriod: revenue.unknownPlans,
    activeSubscriptions: subscriptions,
    oneTimePurchases: oneTime,
  };
}

export function membershipAcquisitionSeries(
  memberships: AdminMembershipLite[],
  buckets: string[],
  grain: "hour" | "day",
  start: Date,
  end: Date,
): Array<{ bucket: string; paid: number; accessCode: number }> {
  const paid = new Map(buckets.map((b) => [b, 0]));
  const access = new Map(buckets.map((b) => [b, 0]));
  for (const row of memberships) {
    const at = membershipActivatedAt(row);
    if (!at) continue;
    const t = new Date(at).getTime();
    if (t < start.getTime() || t >= end.getTime()) continue;
    const bucket = bucketKey(at, grain);
    const channel = classifyMembershipChannel(row);
    if (channel === "paid" && paid.has(bucket)) paid.set(bucket, (paid.get(bucket) ?? 0) + 1);
    if (channel === "access_code" && access.has(bucket)) access.set(bucket, (access.get(bucket) ?? 0) + 1);
  }
  return buckets.map((bucket) => ({
    bucket,
    paid: paid.get(bucket) ?? 0,
    accessCode: access.get(bucket) ?? 0,
  }));
}

export type PairKey = string;

export function pairKey(parentId: string, friendId: string): PairKey {
  return `${parentId}:${friendId}`;
}

export function marketplacePairFunnel(input: {
  requests: AdminRequestLite[];
  conversations: AdminConversationLite[];
  messages: AdminMessageLite[];
  bookings: AdminBookingLite[];
}) {
  const requestPairs = new Set(input.requests.map((r) => pairKey(r.pet_parent_id, r.pet_friend_id)));
  const reqById = new Map(input.requests.map((r) => [r.id, r]));
  const conversationPairs = new Set<string>();
  const convToPair = new Map<string, string>();
  for (const conv of input.conversations) {
    const req = reqById.get(conv.request_id);
    if (!req) continue;
    const key = pairKey(req.pet_parent_id, req.pet_friend_id);
    conversationPairs.add(key);
    convToPair.set(conv.id, key);
  }
  const pairsWithMessages = new Set<string>();
  for (const msg of input.messages) {
    const key = convToPair.get(msg.conversation_id);
    if (key) pairsWithMessages.add(key);
  }
  const bookingPairs = new Set(input.bookings.map((b) => pairKey(b.pet_parent_id, b.pet_friend_id)));
  const completedPairs = new Set(
    input.bookings.filter((b) => b.status === "completed").map((b) => pairKey(b.pet_parent_id, b.pet_friend_id)),
  );
  const steps = [
    { step: "Request pairs", count: requestPairs.size },
    { step: "Conversation pairs", count: conversationPairs.size },
    { step: "Pairs with messages", count: pairsWithMessages.size },
    { step: "Booking pairs", count: bookingPairs.size },
    { step: "Completed booking pairs", count: completedPairs.size },
  ];
  return {
    ...funnelConversions(steps),
    rawMessages: input.messages.length,
  };
}

export function compactSignupFunnel(rows: AdminUserRow[], _authUsers: AdminAuthUser[]) {
  const steps = [
    { step: "Signed up", count: rows.length },
    { step: "Role chosen", count: rows.filter((r) => r.roleChosen).length },
    { step: "Profile ready", count: rows.filter((r) => r.marketplaceReady).length },
    { step: "Request", count: rows.filter((r) => r.requestsSent + r.requestsReceived > 0).length },
    { step: "Chat", count: rows.filter((r) => r.conversations > 0).length },
    { step: "Booking", count: rows.filter((r) => r.bookings > 0).length },
    { step: "Completed", count: rows.filter((r) => r.completedBookings > 0).length },
  ];
  return funnelConversions(steps);
}

export type AvailabilityBucket = "future" | "expired" | "missing";

export function classifyAvailabilityDates(dates: string[], todayIso: string): AvailabilityBucket {
  const normalized = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (normalized.length === 0) return "missing";
  if (normalized.some((d) => d >= todayIso)) return "future";
  return "expired";
}

export function availabilityHealth(input: {
  profiles: AdminProfileLite[];
  pets: AdminPetLite[];
  friendDatesByUser: Map<string, string[]>;
  todayIso: string;
}) {
  const friends = input.profiles.filter((p) => p.role === "pet_friend" || p.role === "both");
  const friendBuckets = { future: 0, expired: 0, missing: 0 };
  for (const friend of friends) {
    const dates = input.friendDatesByUser.get(friend.id) ?? [];
    friendBuckets[classifyAvailabilityDates(dates, input.todayIso)] += 1;
  }
  const petBuckets = { future: 0, expired: 0, missing: 0 };
  for (const pet of input.pets) {
    petBuckets[classifyAvailabilityDates(pet.availability_dates ?? [], input.todayIso)] += 1;
  }
  return { friends: friendBuckets, pets: petBuckets, friendCount: friends.length, petCount: input.pets.length };
}

export type AttentionItem = {
  key: string;
  label: string;
  href: string;
};

export function needsAttentionItems(input: {
  rows: AdminUserRow[];
  requests: AdminRequestLite[];
  availability: ReturnType<typeof availabilityHealth>;
  now?: Date;
  limit?: number;
}): AttentionItem[] {
  const now = input.now ?? new Date();
  const staleMs = STALE_PENDING_REQUEST_DAYS * 24 * 60 * 60 * 1000;
  const stalePending = input.requests.filter((r) => {
    if (r.status !== "pending") return false;
    return now.getTime() - new Date(r.created_at).getTime() > staleMs;
  }).length;
  const noRole = input.rows.filter((r) => !r.roleChosen).length;
  const incomplete = input.rows.filter((r) => r.profileCompletion < 100).length;
  const readyNoRequest = input.rows.filter((r) => r.marketplaceReady && r.requestsSent === 0).length;
  const items: AttentionItem[] = [];
  if (noRole) {
    items.push({
      key: "no_role",
      label: `${noRole} users haven't chosen a role`,
      href: "/admin/users?role=not_chosen",
    });
  }
  if (incomplete) {
    items.push({
      key: "incomplete",
      label: `${incomplete}/${input.rows.length} users have incomplete profiles`,
      href: "/admin/users?incomplete=yes",
    });
  }
  if (readyNoRequest) {
    items.push({
      key: "ready_no_request",
      label: `${readyNoRequest} ready users haven't sent a request`,
      href: "/admin/users?readyNoRequest=yes",
    });
  }
  if (stalePending) {
    items.push({
      key: "stale_requests",
      label: `${stalePending} requests pending > ${STALE_PENDING_REQUEST_DAYS} days`,
      href: `/admin/requests?status=pending&stale=1`,
    });
  }
  if (input.availability.friends.expired) {
    items.push({
      key: "friend_expired",
      label: `${input.availability.friends.expired} Pet Friends have expired availability`,
      href: "/admin/users?availability=expired",
    });
  }
  if (input.availability.friends.missing) {
    items.push({
      key: "friend_missing",
      label: `${input.availability.friends.missing} Pet Friends have no availability`,
      href: "/admin/users?availability=missing",
    });
  }
  return items.slice(0, input.limit ?? OVERVIEW_ATTENTION_LIMIT);
}

export function marketplaceHealthCounts(input: {
  rows: AdminUserRow[];
  requests: AdminRequestLite[];
  conversations: AdminConversationLite[];
  messages: AdminMessageLite[];
  bookings: AdminBookingLite[];
}) {
  const convWithMessages = new Set(input.messages.map((m) => m.conversation_id));
  const reqById = new Map(input.requests.map((r) => [r.id, r]));
  let activeConversations = 0;
  for (const conv of input.conversations) {
    if (!convWithMessages.has(conv.id)) continue;
    const req = reqById.get(conv.request_id);
    if (!req) continue;
    if (req.status === "declined" || req.status === "cancelled") continue;
    activeConversations += 1;
  }
  return {
    profilesReady: input.rows.filter((r) => r.marketplaceReady).length,
    totalUsers: input.rows.length,
    pendingRequests: input.requests.filter((r) => r.status === "pending").length,
    activeConversations,
    activeBookings: input.bookings.filter((b) => b.status === "upcoming" || b.status === "active").length,
  };
}

export function matchmakingSnapshot(input: {
  matches: AdminMatchLite[];
  requests: AdminRequestLite[];
}) {
  if (input.matches.length === 0) {
    return {
      hasProductionRun: false as const,
      lastRun: null as string | null,
      suggestions: 0,
      recipients: 0,
      viewed: 0,
      clicked: 0,
      requestsFromMatches: 0,
    };
  }
  const lastCreated = input.matches.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at;
  const lastDay = lastCreated.slice(0, 10);
  const batch = input.matches.filter((m) => m.created_at.slice(0, 10) === lastDay);
  const users = new Set<string>();
  let viewed = 0;
  let clicked = 0;
  let requestsFromMatches = 0;
  for (const match of batch) {
    users.add(match.pet_parent_id);
    users.add(match.pet_friend_id);
    if (match.viewed_at || match.status === "viewed") viewed += 1;
    if (match.clicked_at) clicked += 1;
    const later = input.requests.some(
      (r) =>
        r.pet_parent_id === match.pet_parent_id &&
        r.pet_friend_id === match.pet_friend_id &&
        r.pet_id === match.pet_id &&
        r.created_at > match.created_at,
    );
    if (later) requestsFromMatches += 1;
  }
  return {
    hasProductionRun: true as const,
    lastRun: lastCreated,
    suggestions: batch.length,
    recipients: users.size,
    viewed,
    clicked,
    requestsFromMatches,
  };
}

export type OverviewFeedItem = {
  at: string;
  label: string;
};

export function overviewActivityFeed(input: {
  profiles: AdminProfileLite[];
  authUsers: AdminAuthUser[];
  pets: AdminPetLite[];
  requests: AdminRequestLite[];
  messages: AdminMessageLite[];
  bookings: AdminBookingLite[];
  memberships: AdminMembershipLite[];
  redemptions: AccessCodeRedemptionLite[];
  limit?: number;
}): OverviewFeedItem[] {
  const names = new Map(input.profiles.map((p) => [p.id, p.display_name]));
  const pets = new Map(input.pets.map((p) => [p.id, p.name]));
  const name = (id: string | null | undefined) => (id ? names.get(id) ?? "Member" : "Member");
  const items: OverviewFeedItem[] = [];

  for (const profile of input.profiles) {
    const created = input.authUsers.find((u) => u.id === profile.id)?.createdAt ?? profile.created_at;
    items.push({ at: created, label: `New user registered: ${profile.display_name || "Member"}` });
  }
  for (const req of input.requests) {
    const sender = req.sender_id || req.pet_friend_id;
    const receiver = req.receiver_id || req.pet_parent_id;
    const pet = pets.get(req.pet_id);
    items.push({
      at: req.created_at,
      label: `${name(sender)} sent a request to ${name(receiver)}${pet ? ` for ${pet}` : ""}`,
    });
  }
  const recentMessages = [...input.messages].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
  for (const msg of recentMessages) {
    items.push({ at: msg.created_at, label: `${name(msg.sender_id)} sent a message` });
  }
  for (const booking of input.bookings) {
    items.push({
      at: booking.created_at,
      label: `Booking created between ${name(booking.pet_parent_id)} and ${name(booking.pet_friend_id)}`,
    });
  }
  for (const row of input.memberships) {
    const at = membershipActivatedAt(row);
    if (!at) continue;
    const channel = classifyMembershipChannel(row);
    const who = name(row.user_id);
    const role = roleLabel(row.role);
    if (channel === "paid") {
      const amount = membershipPlanPrice(row.plan_id ?? "");
      items.push({
        at,
        label: `${who} purchased ${role} membership${amount ? ` — ${amount}` : ""}`,
      });
    } else if (channel === "access_code") {
      items.push({
        at,
        label: `${who} used access code for ${role} membership`,
      });
    }
  }

  return items
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, input.limit ?? OVERVIEW_FEED_LIMIT)
    .map((item) => ({ at: item.at, label: item.label }));
}

export function kpiWithChange(current: number, previous: number): PeriodChange {
  return periodChange(current, previous);
}

export function countByBucket(
  timestamps: Array<string | null | undefined>,
  buckets: string[],
  grain: "hour" | "day",
  start: Date,
  end: Date,
): Array<{ bucket: string; value: number }> {
  const values = new Map(buckets.map((b) => [b, 0]));
  for (const iso of timestamps) {
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (t < start.getTime() || t >= end.getTime()) continue;
    const key = bucketKey(iso, grain);
    if (values.has(key)) values.set(key, (values.get(key) ?? 0) + 1);
  }
  return buckets.map((bucket) => ({ bucket, value: values.get(bucket) ?? 0 }));
}

export function relativeTimeLabel(fromIso: string, now = new Date()): string {
  const ms = now.getTime() - new Date(fromIso).getTime();
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 1) return "Updated just now";
  if (mins === 1) return "Updated 1 min ago";
  if (mins < 60) return `Updated ${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours === 1) return "Updated 1 hour ago";
  return `Updated ${hours} hours ago`;
}

export function overviewPayloadIsUnsafe(payload: unknown): boolean {
  const text = JSON.stringify(payload);
  const banned = [
    '"body"',
    "card_number",
    "cvc",
    "service_role",
    "password",
    "recovery_token",
    "access_token",
    "sk_live",
    "sk_test",
    "stripe_customer_id",
  ];
  return banned.some((key) => text.includes(key));
}
