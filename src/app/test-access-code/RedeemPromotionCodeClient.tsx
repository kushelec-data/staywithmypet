"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AccountLayout } from "@/components/account/AccountLayout";
import { MembershipPromotionCodePanel } from "@/components/membership/MembershipPromotionCodePanel";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { parseMembershipPageRole } from "@/lib/membership-upsell";
import { sanitizeReturnTo } from "@/lib/membership-return";
import type { MembershipRole } from "@/lib/membership";

export function RedeemPromotionCodeClient() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const copy = t.account.membershipPage.promotionCode;
  const roleFromQuery = parseMembershipPageRole(searchParams.get("role"));
  const [role, setRole] = useState<MembershipRole>(roleFromQuery ?? "pet_parent");
  const returnTo = useMemo(
    () => sanitizeReturnTo(searchParams.get("returnTo")),
    [searchParams],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const next = `/test-access-code?${searchParams.toString()}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [authLoading, router, searchParams, user]);

  if (authLoading || !user) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center text-muted sm:px-6">
        {t.account.loading}
      </div>
    );
  }

  return (
    <AccountLayout title={copy.pageTitle} description={copy.pageDescription}>
      <div className="max-w-lg">
        <MembershipPromotionCodePanel
          role={role}
          returnTo={returnTo}
          showRole={!roleFromQuery}
          onRoleChange={setRole}
        />
        <div className="mt-4">
          <Button href="/membership" variant="secondary" size="md">
            {copy.backToPlans}
          </Button>
        </div>
      </div>
    </AccountLayout>
  );
}
