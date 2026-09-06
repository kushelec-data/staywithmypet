import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";

export async function requireAdminApi() {
  const session = await getAdminSession();
  if (!session.ok) {
    return {
      session: null as null,
      response: NextResponse.json(
        { error: session.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: session.status },
      ),
    };
  }
  return { session, response: null as null };
}
