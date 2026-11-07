import type { ProfileRole } from "@/lib/profile-setup";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isCanonicalProfileComplete,
  reminderNeedsRoleOnboarding,
  type ReminderOnboardingProfile,
} from "./completion";
import { knownEmailRole, reminderLocaleFromMetadata } from "./locale";
import type { ReminderUserSnapshot } from "./types";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

const PROFILE_SELECT =
  "id, display_name, bio, location, languages, role, active_mode, role_chosen_at, created_at";

async function paginateSelect(
  admin: AdminClient,
  table: string,
  select: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

async function listAuthUsers(admin: AdminClient) {
  const users: Array<{
    id: string;
    email: string | null;
    createdAt: string | null;
    banned: boolean;
    metadata: Record<string, unknown>;
  }> = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data.users ?? [];
    for (const user of batch) {
      const bannedUntil = (user as { banned_until?: string | null }).banned_until;
      users.push({
        id: user.id,
        email: user.email?.trim() || null,
        createdAt: user.created_at ?? null,
        banned: Boolean(bannedUntil && Date.parse(bannedUntil) > Date.now()),
        metadata: (user.user_metadata ?? {}) as Record<string, unknown>,
      });
    }
    if (batch.length < 1000) break;
    page += 1;
  }
  return users;
}

function stringMeta(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function onboardingProfileFromRow(
  profile: Record<string, unknown> | null,
): ReminderOnboardingProfile | null {
  if (!profile) return null;
  return {
    display_name: String(profile.display_name ?? ""),
    bio: (profile.bio as string | null) ?? null,
    location: (profile.location as string | null) ?? null,
    languages: Array.isArray(profile.languages) ? (profile.languages as string[]) : [],
    role_chosen_at: (profile.role_chosen_at as string | null) ?? null,
  };
}

export function buildReminderUserSnapshot(input: {
  userId: string;
  email: string | null;
  createdAt: string | null;
  banned: boolean;
  metadata: Record<string, unknown>;
  profile: Record<string, unknown> | null;
}): ReminderUserSnapshot {
  const onboardingProfile = onboardingProfileFromRow(input.profile);
  const rolePending = reminderNeedsRoleOnboarding(onboardingProfile);
  const roleRaw = input.profile?.role;
  const role =
    roleRaw === "pet_parent" || roleRaw === "pet_friend" || roleRaw === "both"
      ? (roleRaw as ProfileRole)
      : null;
  const activeMode =
    input.profile?.active_mode === "pet_parent" || input.profile?.active_mode === "pet_friend"
      ? input.profile.active_mode
      : null;
  const emailRole = rolePending ? null : knownEmailRole(role, activeMode);
  const profileComplete = isCanonicalProfileComplete(onboardingProfile, input.email);
  const registeredAt = new Date(
    input.createdAt || (input.profile?.created_at as string | undefined) || 0,
  );

  return {
    userId: input.userId,
    email: input.email,
    registeredAt: Number.isNaN(registeredAt.getTime()) ? new Date(0) : registeredAt,
    role,
    activeMode,
    displayName: input.profile ? String(input.profile.display_name ?? "").trim() || null : null,
    givenName: stringMeta(input.metadata, "given_name") ?? stringMeta(input.metadata, "first_name"),
    fullName: stringMeta(input.metadata, "full_name"),
    metadataName: stringMeta(input.metadata, "name"),
    locale: reminderLocaleFromMetadata(input.metadata),
    banned: input.banned,
    hasAccount: true,
    hasProfile: Boolean(input.profile),
    profileComplete,
    rolePending,
    emailRole,
  };
}

export async function loadReminderAudience(): Promise<ReminderUserSnapshot[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const [authUsers, profileRows] = await Promise.all([
    listAuthUsers(admin),
    paginateSelect(admin, "profiles", PROFILE_SELECT),
  ]);

  const profiles = new Map(profileRows.map((row) => [String(row.id), row]));
  return authUsers.map((user) =>
    buildReminderUserSnapshot({
      userId: user.id,
      email: user.email,
      createdAt: user.createdAt,
      banned: user.banned,
      metadata: user.metadata,
      profile: profiles.get(user.id) ?? null,
    }),
  );
}
