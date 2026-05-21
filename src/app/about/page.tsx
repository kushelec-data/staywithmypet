import { AboutPageClient } from "./AboutPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "About | StayWithMyPet" },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
