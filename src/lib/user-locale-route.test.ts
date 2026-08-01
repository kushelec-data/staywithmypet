import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
    },
  })),
}));

import { POST } from "@/app/api/user/locale/route";

function localeRequest(options: {
  origin?: string;
  host?: string;
  body?: Record<string, unknown>;
}): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options.origin) headers.set("origin", options.origin);
  if (options.host) headers.set("host", options.host);

  return new Request("https://example.com/api/user/locale", {
    method: "POST",
    headers,
    body: JSON.stringify(options.body ?? { locale: "et" }),
  });
}

describe("POST /api/user/locale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUser.mockResolvedValue({ error: null });
  });

  it("accepts valid same-origin requests for signed-in users", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const response = await POST(
      localeRequest({ origin: "https://example.com", host: "example.com", body: { locale: "et" } }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, locale: "et" });
    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { swmp_locale: "et" } });
  });

  it("rejects foreign Origin with generic 403", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const response = await POST(
      localeRequest({
        origin: "https://evil.example",
        host: "example.com",
        body: { locale: "et" },
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("rejects malformed Origin with generic 403", async () => {
    const response = await POST(
      localeRequest({
        origin: "not-a-url",
        host: "example.com",
        body: { locale: "et" },
      }),
    );

    expect(response.status).toBe(403);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("rejects missing Origin header", async () => {
    const response = await POST(
      localeRequest({ host: "example.com", body: { locale: "et" } }),
    );

    expect(response.status).toBe(403);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("preserves unsupported locale coercion to English", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const response = await POST(
      localeRequest({
        origin: "https://example.com",
        host: "example.com",
        body: { locale: "fr" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, locale: "en" });
    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { swmp_locale: "en" } });
  });

  it("preserves unauthenticated skipped behavior", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await POST(
      localeRequest({
        origin: "https://example.com",
        host: "example.com",
        body: { locale: "et" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, skipped: true });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
