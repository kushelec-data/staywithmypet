import { QuizHostClient } from "@/components/quiz/QuizHostClient";

export default async function AdminQuizHostPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  return <QuizHostClient gameId={gameId} />;
}
