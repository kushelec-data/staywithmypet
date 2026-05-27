"use client";

import { PageCta } from "@/components/layout/PageCta";
import { PageHero } from "@/components/layout/PageHero";
import { PageMain } from "@/components/layout/PageMain";
import { RoleModeSearchGuard } from "@/components/role-mode/RoleModeSearchGuard";
import { SearchPageContent } from "@/components/search/SearchPageContent";
import { useLanguage } from "@/context/LanguageContext";
import { Suspense } from "react";

export function FindCarePageClient() {
  const { t } = useLanguage();

  return (
    <>
      <PageHero
        variant="mint"
        badge={t.roles.petParent.label}
        title={t.findCare.title}
        description={t.findCare.subtitle}
      />

      <PageMain>
        <RoleModeSearchGuard page="care">
          <Suspense fallback={null}>
            <SearchPageContent mode="care" />
          </Suspense>
        </RoleModeSearchGuard>
      </PageMain>

      <PageCta
        title={t.findCare.ctaTitle.replace("{role}", t.roles.petFriend.label)}
        description={t.roles.petFriend.description}
        primaryLabel={t.roles.petFriend.cta}
        primaryHref="/find-pets"
        secondaryLabel={t.common.howItWorks}
        secondaryHref="/how-it-works#pet-parent-workflow"
      />
    </>
  );
}
