"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { assertRateLimitShared } from "@/lib/security";
import { headers } from "next/headers";

export type SubscribeNewsletterResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "rate_limit" | "server";
      validationField?: "required" | "invalid";
      message?: string;
      /** Exact backend failure — surfaced in development UI/logging. */
      devMessage?: string;
    };

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function rateLimitIdentity(fallbackEmail: string): Promise<string> {
  const hdrs = await headers();
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip")?.trim() ||
    fallbackEmail
  );
}

export async function subscribeNewsletterAction(email: string): Promise<SubscribeNewsletterResult> {
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return { ok: false, error: "validation", validationField: "required" };
  }

  if (!isValidEmail(normalized)) {
    return { ok: false, error: "validation", validationField: "invalid" };
  }

  try {
    await assertRateLimitShared("newsletter_signup", await rateLimitIdentity(normalized));
  } catch (err) {
    return {
      ok: false,
      error: "rate_limit",
      message: err instanceof Error ? err.message : undefined,
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    const devMessage = "Admin client unavailable — SUPABASE_SERVICE_ROLE_KEY missing";
    if (process.env.NODE_ENV === "development") {
      console.error("[newsletter]", devMessage);
    }
    return { ok: false, error: "server", devMessage };
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("newsletter_subscribers").insert({
    email: normalized,
    subscribed_at: now,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true };
    }
    const devMessage = [error.code, error.message, error.details, error.hint]
      .filter(Boolean)
      .join(" — ");
    console.error("[newsletter] subscribe failed", {
      email: normalized,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { ok: false, error: "server", devMessage };
  }

  return { ok: true };
}
