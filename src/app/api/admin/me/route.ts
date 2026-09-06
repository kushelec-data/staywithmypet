import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session.ok && session.status === 401) {
    return NextResponse.json({ admin: false }, { status: 401 });
  }
  return NextResponse.json({ admin: session.ok });
}
