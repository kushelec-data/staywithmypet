import { ArticlesPageClient } from "./ArticlesPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pet care articles",
  description:
    "Helpful guides for Pet Parents and Pet Friends — from first meetings to routines, trust, and safety.",
};

export default function ArticlesPage() {
  return <ArticlesPageClient />;
}
