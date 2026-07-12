import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureUserProfile } from "@/lib/profile";
import {
  CURRENT_TERMS_VERSION,
  recordTermsAcceptance,
} from "@/lib/terms-acceptance";

/** After email/password or OAuth session is established. */
export async function completeAuthSession(
  supabase: SupabaseClient,
  options: { mode: "login" | "signup"; displayName?: string },
): Promise<void> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("No authenticated user");

  try {
    await ensureUserProfile(supabase, user, {
      displayName: options.mode === "signup" ? options.displayName : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profile save failed";
    throw new Error(`Profile setup failed: ${message}`);
  }

  await syncSignupTermsFromMetadata(supabase, user.id, user.user_metadata);
}

async function syncSignupTermsFromMetadata(
  supabase: SupabaseClient,
  userId: string,
  metadata: Record<string, unknown> | undefined,
): Promise<void> {
  const version = metadata?.terms_version_accepted;
  if (typeof version !== "string" || !version.trim()) return;

  const { count } = await supabase
    .from("terms_acceptance")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("acceptance_context", "signup")
    .eq("terms_version", version);

  if ((count ?? 0) > 0) return;

  await recordTermsAcceptance(supabase, userId, {
    context: "signup",
    termsVersion: version,
  });
}
