import { EmergencyVetClinicsPage } from "@/components/vet/EmergencyVetClinicsPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nearby Veterinary Clinics in Estonia",
  description:
    "Find trusted veterinary clinics and 24/7 emergency animal care across Estonia — for Pet Parents and Pet Friends on Stay With My Pet.",
};

export default function EmergencyCarePage() {
  return <EmergencyVetClinicsPage />;
}
