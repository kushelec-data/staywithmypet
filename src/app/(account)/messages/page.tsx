import { MessagesPageContent } from "@/components/messages/MessagesPageContent";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Messages",
};

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-12 text-center text-sm text-muted">Loading messages…</p>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}
