"use client";

import { PageCta } from "@/components/layout/PageCta";
import { PageHero } from "@/components/layout/PageHero";
import { PageMain } from "@/components/layout/PageMain";
import { RoleModeSearchGuard } from "@/components/role-mode/RoleModeSearchGuard";
import { SearchPageContent } from "@/components/search/SearchPageContent";
import { useLanguage } from "@/context/LanguageContext";

export function FindPetsPageClient() {
  const { t } = useLanguage();

  return (
    <>
      <PageHero
        variant="mint"
        badge={t.roles.petFriend.label}
        title={t.findPets.title}
        description={t.findPets.subtitle}
      />

      <PageMain>
        <RoleModeSearchGuard page="pets">
          <SearchPageContent mode="pets" />
        </RoleModeSearchGuard>
      </PageMain>

      <PageCta
        title={t.findPets.ctaTitle.replace("{role}", t.roles.petParent.label)}
        description={t.roles.petParent.description}
        primaryLabel={t.roles.petParent.cta}
        primaryHref="/find-care"
        secondaryLabel={t.common.howItWorks}
        secondaryHref="/how-it-works#pet-friend-workflow"
      />
    </>
  );
}
