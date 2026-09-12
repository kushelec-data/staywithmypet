import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminUi";

export default function AdminQuizHostMissingPage() {
  return (
    <AdminShell title="Live quiz host" pathname="/admin/quiz">
      <p>No live game was selected.</p>
      <Link href="/admin/quiz" className="mt-4 inline-block font-semibold text-[#2E6B3F]">
        Start a live game
      </Link>
    </AdminShell>
  );
}
