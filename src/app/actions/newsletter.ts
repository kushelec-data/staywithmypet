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
    return { ok: false, error: "server" };
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
    console.error("[newsletter] subscribe failed", {
      code: error.code,
      message: error.message,
    });
    return { ok: false, error: "server" };
  }

  return { ok: true };
}
