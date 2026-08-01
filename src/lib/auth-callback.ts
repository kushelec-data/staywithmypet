import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ensureUserProfile, syncProfileEmailVerified } from "@/lib/profile";
import { fetchUserProfile } from "@/lib/profile-load";
import type { ProfileRow } from "@/lib/profile-utils";
import { safeLogError, safeLogInfo, safeLogWarn } from "@/lib/security/safe-log";

const LOG_PREFIX = "[StayWithMyPet][auth/callback]";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type AuthCallbackLogContext = Record<string, unknown>;

export function logAuthCallback(step: string, context?: AuthCallbackLogContext): void {
  safeLogInfo(`${LOG_PREFIX} ${step}`, context);
}

export function logAuthCallbackWarn(step: string, context?: AuthCallbackLogContext): void {
  safeLogWarn(`${LOG_PREFIX} ${step}`, context);
}

export function logAuthCallbackError(step: string, context?: AuthCallbackLogContext): void {
  safeLogError(`${LOG_PREFIX} ${step}`, context);
}

/** Brief retry loop for session cookies to settle after OAuth code exchange. */
export async function waitForAuthUser(
  supabase: SupabaseClient,
  options?: { attempts?: number; baseDelayMs?: number },
): Promise<User | null> {
  const attempts = options?.attempts ?? 6;
  const baseDelayMs = options?.baseDelayMs ?? 180;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (user) return user;

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (session?.user) return session.user;

    if (userError || sessionError) {
      logAuthCallbackWarn("session not ready", {
        attempt: attempt + 1,
        userError: userError?.message ?? null,
        sessionError: sessionError?.message ?? null,
      });
    }

    if (attempt < attempts - 1) {
      await sleep(baseDelayMs * (attempt + 1));
    }
  }

  return null;
}

export type OAuthCallbackProfileResult = {
  profile: ProfileRow | null;
  ensureError: string | null;
};

/** Ensures profile row exists and loads it with short retries (post-OAuth race). */
export async function ensureOAuthProfile(
  supabase: SupabaseClient,
  user: User,
  options?: { attempts?: number; baseDelayMs?: number },
): Promise<OAuthCallbackProfileResult> {
  const attempts = options?.attempts ?? 5;
  const baseDelayMs = options?.baseDelayMs ?? 200;
  let ensureError: string | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await ensureUserProfile(supabase, user);
      const newlyEmailVerified = await syncProfileEmailVerified(supabase, user);
      ensureError = null;

      if (newlyEmailVerified) {
        const { triggerEmailVerified } = await import("@/lib/email-triggers");
        const profile = await fetchUserProfile(supabase, user.id);
        triggerEmailVerified(user.id, profile?.display_name?.trim() || undefined);
      }
    } catch (err) {
      ensureError = err instanceof Error ? err.message : String(err);
      logAuthCallbackWarn("profile ensure failed", {
        attempt: attempt + 1,
        userId: user.id,
        message: ensureError,
      });
    }

    const profile = await fetchUserProfile(supabase, user.id);
    if (profile) {
      return { profile, ensureError };
    }

    if (attempt < attempts - 1) {
      await sleep(baseDelayMs * (attempt + 1));
    }
  }

  return { profile: null, ensureError };
}
