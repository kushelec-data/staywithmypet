import { GalleryPageContent } from "@/components/account/GalleryPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery",
};

export default function GalleryPage() {
  return <GalleryPageContent />;
}
