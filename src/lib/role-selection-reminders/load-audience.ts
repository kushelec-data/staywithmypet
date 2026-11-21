import { reminderLocaleFromMetadata } from "@/lib/profile-completion-reminders/locale";
import { needsRoleOnboarding, type ProfileRow } from "@/lib/profile-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RoleSelectionUser } from "./types";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

export const ROLE_SELECTION_PROFILE_SELECT = "id, display_name, role, active_mode, role_chosen_at, created_at";

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

function stringMeta(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

export function buildRoleSelectionUser(input: {
  userId: string;
  email: string | null;
  createdAt: string | null;
  banned: boolean;
  metadata: Record<string, unknown>;
  profile: Record<string, unknown> | null;
}): RoleSelectionUser {
  const profile = (input.profile as ProfileRow | null) ?? null;
  const registeredAt = new Date(
    input.createdAt || (typeof input.profile?.created_at === "string" ? input.profile.created_at : 0),
  );
  return {
    userId: input.userId,
    email: input.email,
    registeredAt: Number.isNaN(registeredAt.getTime()) ? new Date(0) : registeredAt,
    displayName: profile ? String(profile.display_name ?? "").trim() || null : null,
    givenName: stringMeta(input.metadata, "given_name") ?? stringMeta(input.metadata, "first_name"),
    fullName: stringMeta(input.metadata, "full_name"),
    metadataName: stringMeta(input.metadata, "name"),
    locale: reminderLocaleFromMetadata(input.metadata),
    banned: input.banned,
    hasAccount: true,
    hasProfile: Boolean(profile),
    rolePending: needsRoleOnboarding(profile),
    roleColumn: profile?.role ?? null,
  };
}

export async function recheckRoleSelected(admin: AdminClient, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("profiles")
    .select(ROLE_SELECTION_PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return !needsRoleOnboarding((data as ProfileRow | null) ?? null);
}

export async function loadRoleSelectionAudience(): Promise<RoleSelectionUser[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const [authUsers, profileRows] = await Promise.all([
    listAuthUsers(admin),
    paginateSelect(admin, "profiles", ROLE_SELECTION_PROFILE_SELECT),
  ]);
  const profiles = new Map(profileRows.map((row) => [String(row.id), row]));

  return authUsers.map((user) =>
    buildRoleSelectionUser({
      userId: user.id,
      email: user.email,
      createdAt: user.createdAt,
      banned: user.banned,
      metadata: user.metadata,
      profile: profiles.get(user.id) ?? null,
    }),
  );
}
