import { CommonLoadingFallback } from "@/components/i18n/SuspenseFallbacks";
import { RedeemPromotionCodeClient } from "@/app/test-access-code/RedeemPromotionCodeClient";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Redeem promotional code",
};

export default function TestAccessCodePage() {
  return (
    <Suspense fallback={<CommonLoadingFallback />}>
      <RedeemPromotionCodeClient />
    </Suspense>
  );
}
