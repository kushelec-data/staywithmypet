import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My preferences",
};

export default function PreferencesPage() {
  redirect("/profile/edit#pet-care-preferences");
}
