import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { assertSupabasePublicEnv } from "@/lib/supabase/env";

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

/**
 * Supabase client for Route Handlers that persist auth cookies on redirects.
 * Server Components and Server Actions should use `createClient()` from `./server`.
 */
export function createRouteHandlerClient(request: NextRequest) {
  const pendingCookies: PendingCookie[] = [];
  const { url, anonKey } = assertSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        pendingCookies.length = 0;
        for (const cookie of cookiesToSet) {
          pendingCookies.push(cookie);
          request.cookies.set(cookie.name, cookie.value);
        }
      },
    },
  });

  function redirectTo(path: string): NextResponse {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const response = NextResponse.redirect(new URL(normalized, request.url));
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }
    return response;
  }

  return { supabase, redirectTo };
}
