"use client";

import { JourneySegmentedTabs } from "@/components/ui/JourneySegmentedTabs";
import { usePathname } from "next/navigation";

export function SearchModeTabs() {
  const pathname = usePathname();
  return <JourneySegmentedTabs pathname={pathname} />;
}
