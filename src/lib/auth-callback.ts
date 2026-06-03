import { ensureUserProfile, syncProfileEmailVerified } from "@/lib/profile";
import { fetchUserProfile } from "@/lib/profile-load";
import type { ProfileRow } from "@/lib/profile-utils";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const LOG_PREFIX = "[StayWithMyPet][auth/callback]";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type AuthCallbackLogContext = Record<string, unknown>;

export function logAuthCallback(step: string, context?: AuthCallbackLogContext): void {
  if (context) {
    console.info(`${LOG_PREFIX} ${step}`, context);
  } else {
    console.info(`${LOG_PREFIX} ${step}`);
  }
}

export function logAuthCallbackWarn(step: string, context?: AuthCallbackLogContext): void {
  if (context) {
    console.warn(`${LOG_PREFIX} ${step}`, context);
  } else {
    console.warn(`${LOG_PREFIX} ${step}`);
  }
}

export function logAuthCallbackError(step: string, context?: AuthCallbackLogContext): void {
  if (context) {
    console.error(`${LOG_PREFIX} ${step}`, context);
  } else {
    console.error(`${LOG_PREFIX} ${step}`);
  }
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
      await syncProfileEmailVerified(supabase, user);
      ensureError = null;
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
