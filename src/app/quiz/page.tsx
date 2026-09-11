import { QuizJoinClient } from "@/components/quiz/QuizJoinClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Quiz",
};

export default function QuizPage() {
  return <QuizJoinClient />;
}
