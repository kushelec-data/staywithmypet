import { describe, expect, it } from "vitest";
import { buildRoleSelectionUser } from "./load-audience";

describe("buildRoleSelectionUser", () => {
  it("treats a missing role_chosen_at as unconfirmed even when role is populated", () => {
    const user = buildRoleSelectionUser({
      userId: "user-1",
      email: "user@example.com",
      createdAt: "2026-08-01T00:00:00.000Z",
      banned: false,
      metadata: { swmp_locale: "et" },
      profile: {
        id: "user-1",
        display_name: "Liis",
        role: "pet_friend",
        active_mode: "pet_friend",
        role_chosen_at: null,
      },
    });
    expect(user.rolePending).toBe(true);
    expect(user.locale).toBe("et");
    expect(user.roleColumn).toBe("pet_friend");
  });

  it("treats role_chosen_at as confirmed", () => {
    const user = buildRoleSelectionUser({
      userId: "user-2",
      email: "user2@example.com",
      createdAt: "2026-08-01T00:00:00.000Z",
      banned: false,
      metadata: { locale: "en" },
      profile: {
        id: "user-2",
        display_name: "Alex",
        role: "pet_parent",
        role_chosen_at: "2026-08-02T00:00:00.000Z",
      },
    });
    expect(user.rolePending).toBe(false);
  });
});
