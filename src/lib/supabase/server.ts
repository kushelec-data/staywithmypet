import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertSupabasePublicEnv } from "@/lib/supabase/env";

export async function createClient() {
  const { url, anonKey } = assertSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll can fail when called from a Server Component; safe to ignore.
        }
      },
    },
  });
}
