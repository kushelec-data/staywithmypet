import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addMembershipMonths,
  canGrantPromotionOverExistingMembership,
  hasPreviousPromotionRedemption,
  isPromotionCurrentlyRedeemable,
  isRegisteredAfterPromotionActivation,
  MEMBERSHIP_PROMOTION_EXPIRES_AT,
  MEMBERSHIP_PROMOTION_HTTP_STATUS,
  MEMBERSHIP_PROMOTION_MONTHS,
  MEMBERSHIP_PROMOTION_PLAN_BY_ROLE,
  MEMBERSHIP_PROMOTION_SOURCE,
  normalizePromotionCode,
  promotionPlanIdForRole,
} from "@/lib/membership-promotion-rules";
import { WELCOME_OFFER_CODE } from "@/lib/new-member-promotion";
import type { UserMembership } from "@/lib/membership";

vi.mock("server-only", () => ({}));

const mockRpc = vi.fn();
const mockGetUser = vi.fn();
const mockRevalidatePath = vi.fn();
const mockTriggerEmail = vi.fn();
const mockRecordTerms = vi.fn();
const mockFirstExceeded = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/membership-emails", () => ({
  triggerMembershipConfirmationEmail: (...args: unknown[]) => mockTriggerEmail(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  }),
}));

vi.mock("@/lib/terms-acceptance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/terms-acceptance")>();
  return {
    ...actual,
    recordTermsAcceptance: (...args: unknown[]) => mockRecordTerms(...args),
  };
});

vi.mock("@/lib/security/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/rate-limit")>();
  return {
    ...actual,
    firstExceededRateLimit: (...args: unknown[]) => mockFirstExceeded(...args),
  };
});

import { POST } from "@/app/api/test-access-code/activate/route";
import {
  parseRedeemMembershipPromotionPayload,
  redeemMembershipPromotion,
} from "@/lib/membership-promotion";

const ROOT = process.cwd();

function membership(overrides: Partial<UserMembership> = {}): UserMembership {
  return {
    id: "m1",
    user_id: "u1",
    role: "pet_friend",
    plan_id: "3-month-friend",
    plan_name: "3 Month",
    status: "active",
    start_date: "2026-01-01T00:00:00.000Z",
    end_date: "2026-12-01T00:00:00.000Z",
    auto_renew: true,
    linked_booking_id: null,
    consumed_at: null,
    cancellation_restart_used: false,
    stripe_customer_id: "cus_1",
    stripe_subscription_id: "sub_1",
    stripe_price_id: "price_1",
    stripe_checkout_session_id: "cs_1",
    ...overrides,
  };
}

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/test-access-code/activate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("STAYTEST3M eligibility rules", () => {
  const activatedAt = "2026-10-20T07:00:00.000Z";

  it("normalizes codes without granting from the string itself", () => {
    expect(normalizePromotionCode(" staytest3m ")).toBe("STAYTEST3M");
    expect(normalizePromotionCode("")).toBe("");
    expect(promotionPlanIdForRole("pet_parent")).toBe("promo-2-month-owner");
    expect(promotionPlanIdForRole("pet_friend")).toBe("promo-2-month-friend");
    expect(MEMBERSHIP_PROMOTION_MONTHS).toBe(2);
    expect(MEMBERSHIP_PROMOTION_PLAN_BY_ROLE.pet_parent).not.toBe("3-month-owner");
  });

  it("accepts only users registered strictly after activation", () => {
    expect(isRegisteredAfterPromotionActivation("2026-10-20T07:00:00.001Z", activatedAt)).toBe(true);
    expect(isRegisteredAfterPromotionActivation("2026-10-20T07:00:00.000Z", activatedAt)).toBe(false);
    expect(isRegisteredAfterPromotionActivation("2026-10-19T12:00:00.000Z", activatedAt)).toBe(false);
    expect(isRegisteredAfterPromotionActivation(null, activatedAt)).toBe(false);
  });

  it("rejects expired or inactive promotions", () => {
    expect(
      isPromotionCurrentlyRedeemable({
        isActive: true,
        now: "2026-11-20T21:59:59.999Z",
        activatedAt,
        expiresAt: MEMBERSHIP_PROMOTION_EXPIRES_AT,
      }),
    ).toBe(true);
    expect(
      isPromotionCurrentlyRedeemable({
        isActive: true,
        now: "2026-11-20T22:00:00.000Z",
        activatedAt,
        expiresAt: MEMBERSHIP_PROMOTION_EXPIRES_AT,
      }),
    ).toBe(false);
    expect(
      isPromotionCurrentlyRedeemable({
        isActive: false,
        now: "2026-10-21T00:00:00.000Z",
        activatedAt,
        expiresAt: MEMBERSHIP_PROMOTION_EXPIRES_AT,
      }),
    ).toBe(false);
    expect(
      isPromotionCurrentlyRedeemable({
        isActive: true,
        now: "2026-10-20T06:59:59.000Z",
        activatedAt,
        expiresAt: MEMBERSHIP_PROMOTION_EXPIRES_AT,
      }),
    ).toBe(false);
  });

  it("blocks previous STAYTEST3M / promotion sources", () => {
    expect(hasPreviousPromotionRedemption(["stripe_checkout"])).toBe(false);
    expect(hasPreviousPromotionRedemption(["platform_access_code"])).toBe(true);
    expect(hasPreviousPromotionRedemption(["test_code"])).toBe(true);
    expect(hasPreviousPromotionRedemption([MEMBERSHIP_PROMOTION_SOURCE])).toBe(true);
  });

  it("does not replace or extend active or cancelled-until-expiry memberships", () => {
    const now = new Date("2026-10-21T00:00:00.000Z");
    expect(canGrantPromotionOverExistingMembership(null, now)).toBe(true);
    expect(
      canGrantPromotionOverExistingMembership(
        membership({ status: "active", end_date: "2026-12-01T00:00:00.000Z" }),
        now,
      ),
    ).toBe(false);
    expect(
      canGrantPromotionOverExistingMembership(
        membership({
          status: "cancelled",
          end_date: "2026-12-01T00:00:00.000Z",
          stripe_subscription_id: "sub_paid",
        }),
        now,
      ),
    ).toBe(false);
    expect(
      canGrantPromotionOverExistingMembership(
        membership({ status: "expired", end_date: "2026-09-01T00:00:00.000Z" }),
        now,
      ),
    ).toBe(true);
  });

  it("grants two calendar months", () => {
    const start = new Date("2026-10-21T10:00:00.000Z");
    expect(addMembershipMonths(start, 2).toISOString()).toBe("2026-12-21T10:00:00.000Z");
  });
});

describe("redeem payload parsing", () => {
  it("requires a code, parent/friend role, and ignores client plan ids", () => {
    expect(parseRedeemMembershipPromotionPayload({}).ok).toBe(false);
    expect(
      parseRedeemMembershipPromotionPayload({
        code: "STAYTEST3M",
        role: "friend",
        planId: "1-year-friend",
        termsAccepted: true,
      }),
    ).toEqual({
      ok: true,
      code: "STAYTEST3M",
      role: "pet_friend",
      termsAccepted: true,
    });
  });
});

describe("redeemMembershipPromotion RPC wrapper", () => {
  const supabase = {
    rpc: mockRpc,
    auth: { getUser: mockGetUser },
  } as never;

  beforeEach(() => {
    mockRpc.mockReset();
    mockTriggerEmail.mockReset();
    mockRevalidatePath.mockReset();
  });

  it("maps new-user, expiry, prior redemption, and paid membership failures", async () => {
    mockRpc.mockResolvedValueOnce({ data: { ok: false, code: "NOT_NEW_USER" }, error: null });
    await expect(
      redeemMembershipPromotion({ supabase, userId: "u1", code: "STAYTEST3M", role: "pet_parent" }),
    ).resolves.toMatchObject({ ok: false, status: 403, code: "NOT_NEW_USER" });

    mockRpc.mockResolvedValueOnce({ data: { ok: false, code: "EXPIRED" }, error: null });
    await expect(
      redeemMembershipPromotion({ supabase, userId: "u1", code: "STAYTEST3M", role: "pet_parent" }),
    ).resolves.toMatchObject({ ok: false, status: 403, code: "EXPIRED" });

    mockRpc.mockResolvedValueOnce({ data: { ok: false, code: "PREVIOUSLY_REDEEMED" }, error: null });
    await expect(
      redeemMembershipPromotion({ supabase, userId: "u1", code: "STAYTEST3M", role: "pet_parent" }),
    ).resolves.toMatchObject({ ok: false, status: 409, code: "PREVIOUSLY_REDEEMED" });

    mockRpc.mockResolvedValueOnce({ data: { ok: false, code: "ACTIVE_MEMBERSHIP" }, error: null });
    await expect(
      redeemMembershipPromotion({ supabase, userId: "u1", code: "STAYTEST3M", role: "pet_friend" }),
    ).resolves.toMatchObject({ ok: false, status: 409, code: "ACTIVE_MEMBERSHIP" });
  });

  it("does not grant when the promotion tables are missing", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: "42P01", message: "relation membership_promotions does not exist" },
    });
    await expect(
      redeemMembershipPromotion({ supabase, userId: "u1", code: "STAYTEST3M", role: "pet_parent" }),
    ).resolves.toMatchObject({ ok: false, status: 503 });
    expect(mockTriggerEmail).not.toHaveBeenCalled();
  });

  it("grants the 2-month promo plan from the RPC instead of a hardcoded fallback", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ok: true,
        membership_id: "mem-1",
        role: "pet_friend",
        plan_id: "promo-2-month-friend",
        start_date: "2026-10-21T10:00:00.000Z",
        end_date: "2026-12-21T10:00:00.000Z",
        source: MEMBERSHIP_PROMOTION_SOURCE,
      },
      error: null,
    });
    const result = await redeemMembershipPromotion({
      supabase,
      userId: "u-new",
      code: "STAYTEST3M",
      role: "pet_friend",
    });
    expect(result).toMatchObject({
      ok: true,
      membership: { planId: "promo-2-month-friend", source: MEMBERSHIP_PROMOTION_SOURCE },
    });
    expect(mockRpc).toHaveBeenCalledWith("redeem_membership_promotion", {
      p_code: "STAYTEST3M",
      p_role: "pet_friend",
    });
    expect(mockTriggerEmail).toHaveBeenCalled();
  });
});

describe("POST /api/test-access-code/activate", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockRpc.mockReset();
    mockRecordTerms.mockReset();
    mockFirstExceeded.mockReset();
    mockTriggerEmail.mockReset();
    mockFirstExceeded.mockResolvedValue({ ok: true });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "new@example.com" } },
      error: null,
    });
    mockRecordTerms.mockResolvedValue({ ok: true });
  });

  it("returns 401 when signed out and 400 without terms", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const unsigned = await POST(
      jsonRequest({ code: "STAYTEST3M", role: "friend", termsAccepted: true }),
    );
    expect(unsigned.status).toBe(401);

    const noTerms = await POST(jsonRequest({ code: "STAYTEST3M", role: "friend", termsAccepted: false }));
    expect(noTerms.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rate-limits redeem attempts", async () => {
    mockFirstExceeded.mockResolvedValueOnce({ ok: false, retryAfterSec: 30 });
    const res = await POST(jsonRequest({ code: "STAYTEST3M", role: "parent", termsAccepted: true }));
    expect(res.status).toBe(429);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("does not return HTTP 410 and does not self-grant without the RPC", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ok: true,
        membership_id: "mem-2",
        role: "pet_parent",
        plan_id: "promo-2-month-owner",
        start_date: "2026-10-21T00:00:00.000Z",
        end_date: "2026-12-21T00:00:00.000Z",
        source: MEMBERSHIP_PROMOTION_SOURCE,
      },
      error: null,
    });
    const res = await POST(jsonRequest({ code: "STAYTEST3M", role: "parent", termsAccepted: true }));
    expect(res.status).toBe(200);
    expect(res.status).not.toBe(410);
    const body = (await res.json()) as { ok?: boolean; planId?: string };
    expect(body.ok).toBe(true);
    expect(body.planId).toBe("promo-2-month-owner");
    expect(mockRpc).toHaveBeenCalled();
  });
});

describe("secure promotion wiring", () => {
  it("keeps the SQL grant path atomic and tied to auth.users.created_at", () => {
    const sql = readFileSync(
      join(ROOT, "supabase/migrations/20261020120000_membership_promotions_staytest3m.sql"),
      "utf8",
    );
    expect(sql).toContain("from auth.users");
    expect(sql).toContain("v_user_created_at <= v_promo.activated_at");
    expect(sql).toContain("for update");
    expect(sql).toContain("unique (promotion_id, user_id)");
    expect(sql).toContain("ACTIVE_MEMBERSHIP");
    expect(sql).toContain("PREVIOUSLY_REDEEMED");
    expect(sql).toContain("make_interval(months => v_promo.membership_months)");
    expect(sql).toContain("timestamptz '2026-11-20 23:59:59.999+02'");
    expect(sql.replace(/\r\n/g, "\n")).toContain("  2,\n  200,\n  true,\n  true");
    expect(sql).not.toMatch(/^\s*500,/m);
    expect(sql).not.toContain("fallbackHardcodedCode");
  });

  it("does not restore the hardcoded fallback or membership self-grant action", () => {
    const files = [
      "src/app/api/test-access-code/activate/route.ts",
      "src/lib/membership-promotion.ts",
      "src/app/actions/membership.ts",
      "src/components/pricing/MembershipPlans.tsx",
      "src/lib/membership-invited-access.ts",
    ];
    for (const relative of files) {
      const source = readFileSync(join(ROOT, relative), "utf8");
      expect(source).not.toContain("fallbackHardcodedCode");
      expect(source).not.toContain("isValidTestAccessCode");
      expect(source).not.toContain("activateMembershipAction");
      expect(source).not.toContain("useTestAccessFlow");
    }
    const activate = readFileSync(join(ROOT, "src/app/api/test-access-code/activate/route.ts"), "utf8");
    expect(activate).not.toContain("upsertUserMembershipAsAdmin");
    expect(activate).toContain("redeemMembershipPromotion");
  });

  it("leaves Stripe checkout and WELCOME90 in place", () => {
    expect(WELCOME_OFFER_CODE).toBe("WELCOME90");
    const checkout = readFileSync(
      join(ROOT, "src/app/api/stripe/create-checkout-session/route.ts"),
      "utf8",
    );
    expect(checkout).toContain("allow_promotion_codes: true");
    const invited = readFileSync(join(ROOT, "src/lib/membership-invited-access.ts"), "utf8");
    expect(invited).not.toContain("useTestAccessFlowOnCards");
  });

  it("maps eligibility failures to stable HTTP statuses", () => {
    expect(MEMBERSHIP_PROMOTION_HTTP_STATUS.NOT_NEW_USER).toBe(403);
    expect(MEMBERSHIP_PROMOTION_HTTP_STATUS.EXPIRED).toBe(403);
    expect(MEMBERSHIP_PROMOTION_HTTP_STATUS.ALREADY_REDEEMED).toBe(409);
    expect(MEMBERSHIP_PROMOTION_HTTP_STATUS.ACTIVE_MEMBERSHIP).toBe(409);
    expect(MEMBERSHIP_PROMOTION_HTTP_STATUS.CAP_REACHED).toBe(403);
  });
});
