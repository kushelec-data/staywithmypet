import { ArticlesPageClient } from "./ArticlesPageClient";
import { PageCta } from "@/components/layout/PageCta";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pet care articles",
  description:
    "Helpful guides for Pet Parents and Pet Friends — from first meetings to routines, trust, and safety.",
};

export default function ArticlesPage() {
  return (
    <>
      <ArticlesPageClient />
      <PageCta
        title="Ready to find trusted pet care?"
        description="Search for care near you, or join as a Pet Friend and spend meaningful time with pets."
        primaryLabel="Find care"
        primaryHref="/find-care"
        secondaryLabel="Become a Pet Friend"
        secondaryHref="/signup"
      />
    </>
  );
}
