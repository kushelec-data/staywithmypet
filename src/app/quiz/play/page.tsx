import { QuizPlayClient } from "@/components/quiz/QuizPlayClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Quiz",
  robots: { index: false, follow: false },
};

export default function QuizPlayPage() {
  return <QuizPlayClient />;
}
