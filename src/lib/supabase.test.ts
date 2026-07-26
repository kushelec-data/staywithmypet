import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClientMock = vi.fn(() => ({ tag: "browser-client" }));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) => createBrowserClientMock(...args),
}));

vi.mock("@/lib/supabase/env", () => ({
  assertSupabasePublicEnv: () => ({
    url: "https://example.supabase.co",
    anonKey: "anon-key",
  }),
}));

describe("createClient browser singleton", () => {
  beforeEach(() => {
    vi.resetModules();
    createBrowserClientMock.mockClear();
  });

  afterEach(async () => {
    const mod = await import("@/lib/supabase");
    mod.__resetBrowserClientForTests();
  });

  it("returns one shared browser client across calls", async () => {
    const { createClient, __resetBrowserClientForTests } = await import("@/lib/supabase");
    __resetBrowserClientForTests();

    const first = createClient();
    const second = createClient();

    expect(first).toBe(second);
    expect(createBrowserClientMock).toHaveBeenCalledTimes(1);
  });
});
