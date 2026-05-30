import { resolvePostLoginPath } from "@/lib/auth-routing";
import { ensureUserProfile, syncProfileEmailVerified } from "@/lib/profile";
import { fetchUserProfile } from "@/lib/profile-load";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let destination = requestedNext ?? "/dashboard";
      if (user) {
        try {
          await ensureUserProfile(supabase, user);
          await syncProfileEmailVerified(supabase, user);
        } catch (profileError) {
          console.error("[StayWithMyPet] Profile sync after OAuth failed:", profileError);
        }
        const profile = await fetchUserProfile(supabase, user.id);
        if (profile && profile.id !== user.id) {
          console.error("[StayWithMyPet] Profile session mismatch after OAuth", {
            userId: user.id,
            profileId: profile.id,
          });
          return NextResponse.redirect(`${origin}/login?error=profile_session`);
        }
        destination = resolvePostLoginPath(profile, requestedNext);
      }

      return NextResponse.redirect(`${origin}${destination.startsWith("/") ? destination : `/${destination}`}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
