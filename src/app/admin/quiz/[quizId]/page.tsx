import { redirect } from "next/navigation";

export default async function LegacyAdminQuizIdPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  if (quizId === "host") redirect("/admin/quiz");
  redirect(`/admin/quiz/edit/${quizId}`);
}
