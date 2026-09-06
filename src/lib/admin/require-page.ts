import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";

export async function requireAdminPage(nextPath: string) {
  const session = await getAdminSession();
  if (!session.ok && session.status === 401) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (!session.ok) {
    redirect("/dashboard");
  }
  return session.userId;
}
