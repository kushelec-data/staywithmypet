import { AdminShell } from "@/components/admin/AdminUi";
import { QuizAdminList } from "@/components/admin/QuizAdminList";
import { listQuizzes } from "@/lib/quiz/store";

export default async function AdminQuizPage() {
  const quizzes = await listQuizzes();
  return (
    <AdminShell title="Quiz" pathname="/admin/quiz" description="Create quizzes and start a live game.">
      <QuizAdminList initial={quizzes} />
    </AdminShell>
  );
}
