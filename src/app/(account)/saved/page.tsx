import { SavedPageContent } from "@/components/saved/SavedPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved",
};

export default function SavedPage() {
  return <SavedPageContent />;
}
