import { createBrowserClient } from "@supabase/ssr";
import { assertSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** @internal Resets the browser singleton (tests only). */
export function __resetBrowserClientForTests(): void {
  browserClient = null;
}

export function createClient() {
  const { url, anonKey } = assertSupabasePublicEnv();

  // Never cache a client created during SSR — only reuse a browser singleton.
  if (typeof window === "undefined") {
    return createBrowserClient<Database>(url, anonKey);
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, anonKey);
    if (
      process.env.NODE_ENV === "development" ||
      process.env.APP_DEV_PERF === "1"
    ) {
      console.info("[app-perf]", {
        scope: "supabase.createClient",
        singleton: true,
        created: true,
      });
    }
  }
  return browserClient;
}
