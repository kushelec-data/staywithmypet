import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/auth", () => ({
  getAdminSession: vi.fn(),
}));

vi.mock("@/lib/email-campaigns/store", () => ({
  listCampaignSummaries: vi.fn(async () => []),
  createSeptemberTestDraft: vi.fn(),
  createSeptemberEstonianDraft: vi.fn(),
  createCampaign: vi.fn(),
  resolveRegisteredUserRecipients: vi.fn(async () => []),
  getCampaignDetail: vi.fn(),
  getRecipientActivity: vi.fn(),
  recordOpenByToken: vi.fn(async () => true),
  recordClickByToken: vi.fn(async () => ({ destinationUrl: "https://fb.me/e/6lnf7O3Sh" })),
}));

vi.mock("@/lib/email-campaigns/send", () => ({
  sendTestCampaign: vi.fn(async () => ({ sent: 0, failed: 0 })),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimitShared: vi.fn(async () => ({ ok: true })),
  rateLimitMessage: () => "Too many attempts",
}));

describe("admin email campaign API authorization", () => {
  it("returns 401 for anonymous access", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: false, status: 401 });
    const { GET } = await import("@/app/api/admin/email-campaigns/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for a normal authenticated user", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: false, status: 403 });
    const { GET } = await import("@/app/api/admin/email-campaigns/route");
    const res = await GET();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(JSON.stringify(json)).not.toMatch(/SMTP_PASSWORD|service_role|html_en/);
  });

  it("allows an approved admin and does not return SMTP secrets or bodies", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: true, userId: "admin-1" });
    const { GET } = await import("@/app/api/admin/email-campaigns/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.from).toBe("Stay With My Pet <info@staywithmypet.ee>");
    expect(json.campaigns).toEqual([]);
    expect(JSON.stringify(json)).not.toMatch(/SMTP_PASSWORD|smtp\.password|service_role/);
    expect(json.campaigns[0]?.htmlEn).toBeUndefined();
  });
});

describe("send test confirmation", () => {
  it("refuses send test without confirm", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    vi.mocked(getAdminSession).mockResolvedValue({ ok: true, userId: "admin-1" });
    const { POST } = await import("@/app/api/admin/email-campaigns/[campaignId]/send-test/route");
    const res = await POST(new Request("https://example.com", { method: "POST", body: "{}" }), {
      params: Promise.resolve({ campaignId: "c1" }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.sent).toBe(false);
  });
});

describe("public tracking endpoints", () => {
  it("open pixel returns a gif and does not echo email", async () => {
    const { GET } = await import("@/app/api/email/track/open/[token]/route");
    const token = "a".repeat(43);
    const res = await GET(new Request("https://example.com/api/email/track/open/" + token), {
      params: Promise.resolve({ token }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/gif");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(10);
    expect(JSON.stringify([...res.headers.entries()])).not.toContain("@gmail.com");
  });

  it("click tracking redirects to the Facebook event", async () => {
    const { GET } = await import("@/app/api/email/track/click/[token]/route");
    const token = "b".repeat(43);
    const res = await GET(new Request("https://example.com/api/email/track/click/" + token), {
      params: Promise.resolve({ token }),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://fb.me/e/6lnf7O3Sh");
  }, 15_000);
});
