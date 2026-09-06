import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { shouldForwardHomepageToAuthConfirm } from "@/lib/auth-confirm-redirect";
import { assertSupabasePublicEnv } from "@/lib/supabase/env";

const LOGIN_PATH = "/login";

/** Routes that require an authenticated session. Public pages (/users, /pet, marketing) stay open. */
function isProtectedPath(pathname: string): boolean {
  if (pathname === "/pets/new" || pathname.startsWith("/pets/new/")) return true;
  if (pathname.startsWith("/pets/") && pathname.includes("/edit")) return true;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true;
  if (pathname === "/profile/edit" || pathname.startsWith("/profile/edit/")) return true;
  if (pathname === "/profile/setup" || pathname.startsWith("/profile/setup/")) return true;
  if (pathname === "/messages" || pathname.startsWith("/messages/")) return true;
  if (pathname === "/requests" || pathname.startsWith("/requests/")) return true;
  if (pathname === "/bookings" || pathname.startsWith("/bookings/")) return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldForwardHomepageToAuthConfirm(pathname, request.nextUrl.searchParams)) {
    const confirmUrl = request.nextUrl.clone();
    confirmUrl.pathname = "/auth/confirm";
    return NextResponse.redirect(confirmUrl);
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next({ request });
  }

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
    "/",
    "/dashboard/:path*",
    "/profile/edit",
    "/profile/edit/:path*",
    "/profile/setup",
    "/profile/setup/:path*",
    "/messages/:path*",
    "/requests/:path*",
    "/bookings/:path*",
    "/pets/new",
    "/pets/:path*/edit",
    "/admin",
    "/admin/:path*",
  ],
};
