"use client";

import { SendRequestButton } from "@/components/requests/SendRequestButton";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import type { PublicProfileView } from "@/lib/public-profile";
import { resolvedAvailability } from "@/lib/profile-details";
import { usePathname } from "next/navigation";

type PublicContactCtaProps = {
  profile: PublicProfileView;
};

export function PublicContactCta({ profile }: PublicContactCtaProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isSelf = user?.id === profile.id;
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;
  const friendAvailability = resolvedAvailability(profile.details).selected_dates ?? [];

  if (isSelf) {
    return (
      <section className="card-elevated rounded-2xl p-4 sm:p-5">
        <h2 className="font-heading text-base font-semibold text-foreground">Your public profile</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button href="/dashboard" size="sm">
            Dashboard
          </Button>
          <Button href="/profile/edit" variant="outline" size="sm">
            Edit profile
          </Button>
        </div>
      </section>
    );
  }

  if (!user && !loading) {
    return (
      <section className="card-elevated rounded-2xl p-4 sm:p-5">
        <h2 className="font-heading text-base font-semibold text-foreground">Get in touch</h2>
        <p className="mt-1 text-xs text-muted">Sign in to send a care request.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button href={loginHref} size="sm">
            Log in
          </Button>
          <Button href="/signup" variant="outline" size="sm">
            Sign up
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="card-elevated rounded-2xl p-4 sm:p-5">
      <h2 className="font-heading text-base font-semibold text-foreground">Send a request</h2>
      <div className="mt-3">
        <SendRequestButton
          target={{
            kind: "profile",
            friendId: profile.id,
            label: profile.display_name,
            availabilityDates: friendAvailability,
          }}
          size="md"
          className="w-full justify-center"
        />
      </div>
    </section>
  );
}
