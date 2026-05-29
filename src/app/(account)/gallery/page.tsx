import { AccountCard } from "@/components/account/AccountCard";
import { AccountLayout } from "@/components/account/AccountLayout";
import { PawPlaceholder } from "@/components/ui/PawPlaceholder";
import { Button } from "@/components/ui/Button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery",
};

const slots = 6;

export default function GalleryPage() {
  return (
    <AccountLayout
      title="Your gallery"
      description="Upload up to 6 photos that appear on your public profile and help others get to know you."
    >
      <AccountCard className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="text-sm text-muted">Add photos to your profile when media upload is connected.</p>
          <Button href="/gallery" variant="secondary" size="sm">
            Edit gallery
          </Button>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: slots }, (_, i) => (
            <li key={i}>
              <PawPlaceholder
                seed={`gallery-slot-${i + 1}`}
                label={`Gallery photo ${i + 1}`}
                caption={`Photo ${i + 1}`}
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
