import { createBrowserClient } from "@supabase/ssr";
import { assertSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export function createClient() {
  const { url, anonKey } = assertSupabasePublicEnv();
  return createBrowserClient<Database>(url, anonKey);
}
