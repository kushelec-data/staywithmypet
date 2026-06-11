"use client";

import { AccountCard } from "@/components/account/AccountCard";
import { AccountLayout } from "@/components/account/AccountLayout";
import { PawPlaceholder } from "@/components/ui/PawPlaceholder";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";

const slots = 6;

export function GalleryPageContent() {
  const { t } = useLanguage();
  const g = t.account.gallery;

  return (
    <AccountLayout title={g.pageTitle} description={g.pageDescription}>
      <AccountCard className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="text-sm text-muted">{g.pageDescription}</p>
          <Button href="/gallery" variant="secondary" size="sm">
            {t.profileEdit.edit}
          </Button>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: slots }, (_, i) => (
            <li key={i}>
              <PawPlaceholder
                seed={`gallery-slot-${i + 1}`}
                label={`${g.pageTitle} ${i + 1}`}
                caption={`${i + 1}`}
                emoji={["🐕", "🐈", "🐾", "🦮", "🐶", "🐰"][i % 6]}
                className="aspect-square w-full"
              />
            </li>
          ))}
        </ul>
      </AccountCard>
    </AccountLayout>
  );
}
