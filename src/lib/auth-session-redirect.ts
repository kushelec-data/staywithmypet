import { resolveAuthenticatedSessionPath } from "@/lib/auth-routing";
import { fetchUserProfile } from "@/lib/profile-load";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Server guard: send authenticated users away from guest-only auth/marketing entry points. */
export async function redirectIfAuthenticated(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const profile = await fetchUserProfile(supabase, user.id);
  redirect(resolveAuthenticatedSessionPath(profile));
}
