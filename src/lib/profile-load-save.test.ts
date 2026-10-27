import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";
import { emptyMembershipsByRole } from "@/lib/membership";
import { NO_WELCOME_OFFER_ELIGIBLE } from "@/lib/membership-load";
import {
  PROFILE_PUBLIC_CREATE_COLUMNS,
  saveOwnProfileRowAndReload,
} from "@/lib/profile-load";
import { AuthRequiredError, ForbiddenError } from "@/lib/security/assert-owner";

vi.mock("@/lib/membership-load", () => ({
  NO_WELCOME_OFFER_ELIGIBLE: { pet_parent: false, pet_friend: false },
  resolveMembershipSnapshot: vi.fn(async () => ({
    memberships: emptyMembershipsByRole(),
    welcomeOfferEligibleByRole: NO_WELCOME_OFFER_ELIGIBLE,
  })),
}));

const OWNER_ID = "fd7e769e-5406-4034-ad11-b66057916172";
const OTHER_ID = "00000000-0000-4000-8000-000000000099";

function pgError(code: string, message: string): PostgrestError {
  return {
    name: "PostgrestError",
    message,
    details: "",
    hint: "",
    code,
  };
}

function ownerUser(overrides: Partial<User> = {}): User {
  return {
    id: OWNER_ID,
    email: "martins.nathalia@gmail.com",
    user_metadata: { full_name: "Nathalia Martins" },
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-10-26T13:54:53.000Z",
    ...overrides,
  } as User;
}

function savedProfileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: OWNER_ID,
    display_name: "Nathalia Martins",
    avatar_url: "https://lh3.googleusercontent.com/a/nathalia",
    bio: "I love dogs and city walks.",
    location: "Tallinn",
    public_location: "Tallinn",
    role: "pet_parent",
    languages: ["en", "pt"],
    phone: "37255512345",
    phone_e164: "+37255512345",
    is_public: true,
    rating_avg: 0,
    rating_count: 0,
    details: { avatar_position: "center" },
    created_at: "2026-10-26T13:54:53.000Z",
    ...overrides,
  };
}

const setupPayload = {
  id: OTHER_ID,
  display_name: "Nathalia Martins",
  role: "pet_parent",
  languages: ["en", "pt"],
  bio: "I love dogs and city walks.",
  phone: "+37255512345",
  phone_country_code: "+372",
  phone_number: "55512345",
  phone_e164: "+37255512345",
  location: "Tallinn",
  public_location: "Tallinn",
  details: { email_verified: true, avatar_position: "center" },
  updated_at: "2026-10-26T14:45:00.000Z",
};

type UpdateResult = { data: { id: string } | null; error: PostgrestError | null };

function createSaveClient(options: {
  user?: User | null;
  authError?: { message: string } | null;
  updateResults: UpdateResult[];
  insertError?: PostgrestError | null;
  profileAfterSave?: Record<string, unknown> | null;
}) {
  const updates: Array<{ payload: Record<string, unknown>; id: string }> = [];
  const inserts: Record<string, unknown>[] = [];
  const eqIds: string[] = [];
  let updateIndex = 0;
  const upsert = vi.fn(() => {
    throw new Error("profiles upsert is not allowed");
  });

  const selectBuilder = () => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn(async () => ({
        data: options.profileAfterSave ?? null,
        error: null,
      })),
    })),
    limit: vi.fn(async () => ({ data: [], error: null })),
  });

  const client = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: options.user ?? null },
        error: options.authError ?? null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === "my_profile") {
        return { select: vi.fn(() => selectBuilder()) };
      }
      if (table !== "profiles") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        upsert,
        update: vi.fn((payload: Record<string, unknown>) => ({
          eq: vi.fn((column: string, id: string) => {
            expect(column).toBe("id");
            eqIds.push(id);
            updates.push({ payload, id });
            return {
              select: vi.fn((columns: string) => {
                expect(columns).toBe("id");
                return {
                  maybeSingle: vi.fn(async () => {
                    const result =
                      options.updateResults[updateIndex] ??
                      options.updateResults[options.updateResults.length - 1] ?? {
                        data: null,
                        error: null,
                      };
                    updateIndex += 1;
                    return result;
                  }),
                };
              }),
            };
          }),
        })),
        insert: vi.fn((row: Record<string, unknown>) => {
          inserts.push(row);
          return Promise.resolve({ error: options.insertError ?? null });
        }),
        select: vi.fn(() => selectBuilder()),
      };
    }),
  };

  return {
    client: client as unknown as SupabaseClient,
    updates,
    inserts,
    eqIds,
    upsert,
  };
}

describe("saveOwnProfileRowAndReload", () => {
  it("saves owner setup fields with UPDATE scoped to the session user", async () => {
    const { client, updates, inserts, eqIds, upsert } = createSaveClient({
      user: ownerUser(),
      updateResults: [{ data: { id: OWNER_ID }, error: null }],
      profileAfterSave: savedProfileRow(),
    });

    const saved = await saveOwnProfileRowAndReload(client, OWNER_ID, setupPayload, "save");

    expect(upsert).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
    expect(eqIds).toEqual([OWNER_ID]);
    expect(updates).toHaveLength(1);
    expect(updates[0]?.payload).not.toHaveProperty("id");
    expect(updates[0]?.payload).toMatchObject({
      display_name: "Nathalia Martins",
      bio: "I love dogs and city walks.",
      languages: ["en", "pt"],
      location: "Tallinn",
      phone: "+37255512345",
      phone_e164: "+37255512345",
    });
    expect(saved.display_name).toBe("Nathalia Martins");
    expect(saved.bio).toBe("I love dogs and city walks.");
    expect(saved.languages).toEqual(["en", "pt"]);
    expect(saved.location).toBe("Tallinn");
    expect(saved.phone).toBe("+37255512345");
    expect(saved.avatar_url).toBe("https://lh3.googleusercontent.com/a/nathalia");
  });

  it("rejects a caller-supplied user id that does not match the session", async () => {
    const { client, updates, inserts, upsert } = createSaveClient({
      user: ownerUser(),
      updateResults: [{ data: { id: OWNER_ID }, error: null }],
      profileAfterSave: savedProfileRow(),
    });

    await expect(
      saveOwnProfileRowAndReload(client, OTHER_ID, setupPayload, "save"),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(upsert).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
    expect(inserts).toEqual([]);
  });

  it("does not treat a missing profile UPDATE as success", async () => {
    const { client, updates, inserts } = createSaveClient({
      user: ownerUser(),
      updateResults: [
        { data: null, error: null },
        { data: null, error: null },
      ],
      profileAfterSave: null,
    });

    await expect(
      saveOwnProfileRowAndReload(client, OWNER_ID, setupPayload, "save"),
    ).rejects.toThrow("Profile could not be saved.");
    expect(inserts).toHaveLength(1);
    expect(updates.length).toBeGreaterThanOrEqual(2);
  });

  it("creates a missing row with public columns only, then UPDATEs private setup fields", async () => {
    const { client, updates, inserts, upsert } = createSaveClient({
      user: ownerUser(),
      updateResults: [
        { data: null, error: null },
        { data: { id: OWNER_ID }, error: null },
      ],
      profileAfterSave: savedProfileRow(),
    });

    const saved = await saveOwnProfileRowAndReload(client, OWNER_ID, setupPayload, "save");

    expect(upsert).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(1);
    expect(Object.keys(inserts[0] ?? {}).sort()).toEqual([...PROFILE_PUBLIC_CREATE_COLUMNS].sort());
    expect(inserts[0]).toEqual({
      id: OWNER_ID,
      display_name: "Nathalia Martins",
      avatar_url: null,
    });
    expect(inserts[0]).not.toHaveProperty("phone");
    expect(inserts[0]).not.toHaveProperty("details");
    expect(inserts[0]).not.toHaveProperty("location");
    expect(updates[1]?.payload).toMatchObject({
      bio: "I love dogs and city walks.",
      languages: ["en", "pt"],
      phone_e164: "+37255512345",
      location: "Tallinn",
    });
    expect(saved.id).toBe(OWNER_ID);
    expect(saved.phone).toBe("+37255512345");
  });

  it("retries UPDATE when the public insert races with handle_new_user", async () => {
    const { client, updates } = createSaveClient({
      user: ownerUser(),
      updateResults: [
        { data: null, error: null },
        { data: { id: OWNER_ID }, error: null },
      ],
      insertError: pgError("23505", "duplicate key value violates unique constraint"),
      profileAfterSave: savedProfileRow(),
    });

    const saved = await saveOwnProfileRowAndReload(client, OWNER_ID, setupPayload, "save");
    expect(updates).toHaveLength(2);
    expect(saved.display_name).toBe("Nathalia Martins");
  });

  it("saves for Google OAuth and email/password session users", async () => {
    for (const user of [
      ownerUser({ email: "martins.nathalia@gmail.com", user_metadata: { full_name: "Nathalia Martins" } }),
      ownerUser({ email: "parent@example.com", user_metadata: {} }),
    ]) {
      const { client, eqIds } = createSaveClient({
        user,
        updateResults: [{ data: { id: OWNER_ID }, error: null }],
        profileAfterSave: savedProfileRow({
          display_name: "Nathalia Martins",
          role: "pet_friend",
        }),
      });
      const saved = await saveOwnProfileRowAndReload(client, OWNER_ID, setupPayload, "save");
      expect(eqIds).toEqual([OWNER_ID]);
      expect(saved.id).toBe(OWNER_ID);
    }
  });

  it("strips a missing column and retries UPDATE, not UPSERT", async () => {
    const { client, updates, inserts, upsert } = createSaveClient({
      user: ownerUser(),
      updateResults: [
        {
          data: null,
          error: pgError("42703", "column 'phone_e164' does not exist"),
        },
        { data: { id: OWNER_ID }, error: null },
      ],
      profileAfterSave: savedProfileRow({ phone_e164: null, phone: "+37255512345" }),
    });

    await saveOwnProfileRowAndReload(client, OWNER_ID, setupPayload, "save");

    expect(upsert).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
    expect(updates).toHaveLength(2);
    expect(updates[1]?.payload).not.toHaveProperty("phone_e164");
    expect(updates[1]?.payload).toHaveProperty("display_name", "Nathalia Martins");
  });

  it("requires a signed-in session user", async () => {
    const { client, updates } = createSaveClient({
      user: null,
      authError: { message: "Auth session missing" },
      updateResults: [{ data: { id: OWNER_ID }, error: null }],
    });

    await expect(
      saveOwnProfileRowAndReload(client, OWNER_ID, setupPayload, "save"),
    ).rejects.toBeInstanceOf(AuthRequiredError);
    expect(updates).toEqual([]);
  });

  it("maps permission-denied UPDATE to the friendly client error", async () => {
    const { client, inserts } = createSaveClient({
      user: ownerUser(),
      updateResults: [
        {
          data: null,
          error: pgError("42501", "permission denied for table profiles"),
        },
      ],
    });

    await expect(
      saveOwnProfileRowAndReload(client, OWNER_ID, setupPayload, "save"),
    ).rejects.toThrow("You do not have permission to do that.");
    expect(inserts).toEqual([]);
  });
});

describe("profile save paths after column privacy", () => {
  it("does not upsert public.profiles anywhere in the owner save stack", () => {
    const files = [
      "src/lib/profile-load.ts",
      "src/lib/profile-setup.ts",
      "src/lib/profile.ts",
      "src/lib/profile-avatar.ts",
      "src/lib/profile-gallery.ts",
      "src/lib/profile-preferences.ts",
      "src/lib/profile-visibility.ts",
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/from\("profiles"\)[\s\S]{0,80}\.upsert\(/);
    }
  });

  it("creates missing profiles with public columns only", () => {
    const ensure = readFileSync(join(process.cwd(), "src/lib/profile.ts"), "utf8");
    const insert = ensure.slice(
      ensure.indexOf("const { error: insertError }"),
      ensure.indexOf("if (insertError) throw insertError;"),
    );
    expect(insert).toContain("id: user.id");
    expect(insert).toContain("display_name: displayName");
    expect(insert).toContain("avatar_url: avatarUrl");
    expect(insert).not.toContain("phone");
    expect(insert).not.toContain("details");
    expect(insert).not.toContain("location");
  });
});
