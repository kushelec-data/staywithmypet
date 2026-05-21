import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { assertSupabasePublicEnv } from "@/lib/supabase/env";

const LOGIN_PATH = "/login";

/** Routes that require an authenticated session (public beta). */
function isProtectedPath(pathname: string): boolean {
  if (pathname === "/pets/new" || pathname.startsWith("/pets/new/")) return true;
  if (pathname.startsWith("/pets/") && pathname.includes("/edit")) return true;
  if (pathname === "/membership" || pathname.startsWith("/membership/")) return true;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true;
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return true;
  if (pathname === "/messages" || pathname.startsWith("/messages/")) return true;
  if (pathname === "/requests" || pathname.startsWith("/requests/")) return true;
  if (pathname === "/bookings" || pathname.startsWith("/bookings/")) return true;
  if (pathname === "/preferences" || pathname.startsWith("/preferences/")) return true;
  if (pathname === "/saved" || pathname.startsWith("/saved/")) return true;
  if (pathname === "/gallery" || pathname.startsWith("/gallery/")) return true;
  if (pathname === "/change-password" || pathname.startsWith("/change-password/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  let url: string;
  let anonKey: string;
  try {
    ({ url, anonKey } = assertSupabasePublicEnv());
  } catch {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = LOGIN_PATH;
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/messages/:path*",
    "/requests/:path*",
    "/bookings/:path*",
    "/membership/:path*",
    "/pets/new",
    "/pets/:path*/edit",
    "/preferences/:path*",
    "/saved/:path*",
    "/gallery/:path*",
    "/change-password/:path*",
  ],
};
