import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminUi";
import { QuizEditor } from "@/components/admin/QuizEditor";
import { getQuiz } from "@/lib/quiz/store";

export default async function AdminQuizEditPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const packed = await getQuiz(quizId);
  if (!packed) {
    return (
      <AdminShell title="Quiz" pathname="/admin/quiz">
        <p>Quiz not found.</p>
        <Link href="/admin/quiz" className="font-semibold text-[#2E6B3F]">
          Back
        </Link>
      </AdminShell>
    );
  }
  return (
    <AdminShell
      title={packed.quiz.title}
      pathname="/admin/quiz"
      actions={
        <Link href="/admin/quiz" className="text-sm font-semibold text-[#2E6B3F]">
          All quizzes
        </Link>
      }
    >
      <QuizEditor quizId={packed.quiz.id} title={packed.quiz.title} questions={packed.questions} />
    </AdminShell>
  );
}
