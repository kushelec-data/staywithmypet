import { MatchesPageContent } from "@/components/matches/MatchesPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Matches",
};

export default function MatchesPage() {
  return <MatchesPageContent />;
}
