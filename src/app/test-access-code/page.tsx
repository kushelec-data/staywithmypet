import { CommonLoadingFallback } from "@/components/i18n/SuspenseFallbacks";
import { TestAccessCodePageClient } from "@/app/test-access-code/TestAccessCodePageClient";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Test access code",
};

export default function TestAccessCodePage() {
  return (
    <Suspense fallback={<CommonLoadingFallback />}>
      <TestAccessCodePageClient />
    </Suspense>
  );
}
