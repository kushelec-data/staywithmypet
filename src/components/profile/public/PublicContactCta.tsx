"use client";

import { SendRequestButton } from "@/components/requests/SendRequestButton";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import type { PublicProfileView } from "@/lib/public-profile";
import { resolvedAvailability } from "@/lib/profile-details";
import { useLanguage } from "@/context/LanguageContext";
import { usePathname } from "next/navigation";

type PublicContactCtaProps = {
  profile: PublicProfileView;
};

export function PublicContactCta({ profile }: PublicContactCtaProps) {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isSelf = user?.id === profile.id;
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;
  const friendAvailability = resolvedAvailability(profile.details).selected_dates ?? [];

  if (isSelf) {
    return (
      <section className="card-elevated rounded-2xl p-4 sm:p-5">
        <h2 className="font-heading text-base font-semibold text-foreground">{t.dashboardHome.yourPublicProfile}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button href="/dashboard" size="sm">
            {t.navbar.dashboard}
          </Button>
          <Button href="/profile/edit" variant="outline" size="sm">
            {t.dashboardHome.editProfile}
          </Button>
        </div>
      </section>
    );
  }

  if (!user && !loading) {
    return (
      <section className="card-elevated rounded-2xl p-4 sm:p-5">
        <h2 className="font-heading text-base font-semibold text-foreground">{t.publicProfileUi.getInTouch}</h2>
        <p className="mt-1 text-xs text-muted">{t.publicProfileUi.signInToRequest}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button href={loginHref} size="sm">
            {t.navbar.login}
          </Button>
          <Button href="/signup" variant="outline" size="sm">
            {t.navbar.getStarted}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="card-elevated rounded-2xl p-4 sm:p-5">
      <h2 className="font-heading text-base font-semibold text-foreground">{t.publicProfileUi.sendRequest}</h2>
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
