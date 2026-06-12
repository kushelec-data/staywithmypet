import { MessagesLoadingFallback } from "@/components/i18n/SuspenseFallbacks";
import { MessagesPageContent } from "@/components/messages/MessagesPageContent";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Messages",
};

export default function MessagesPage() {
  return (
    <Suspense
      fallback={<MessagesLoadingFallback />}
    >
      <MessagesPageContent />
    </Suspense>
  );
}
