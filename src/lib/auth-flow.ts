import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureUserProfile } from "@/lib/profile";

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
}
