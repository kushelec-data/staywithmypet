import { loadActiveMembershipUserIds } from "@/lib/marketplace-membership-server";
import type { MembershipRole } from "@/lib/membership";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseRole(value: string | null): MembershipRole | null {
  if (value === "pet_parent" || value === "pet_friend") return value;
  return null;
}

/** Active user_memberships user IDs for marketplace filtering (no RPC required). */
export async function GET(request: Request) {
  const role = parseRole(new URL(request.url).searchParams.get("role"));
  if (!role) {
    return NextResponse.json({ userIds: [] }, { status: 400 });
  }

  const userIds = [...(await loadActiveMembershipUserIds(role))];

  console.info("[marketplace/api] active membership user ids", {
    role,
    count: userIds.length,
  });

  return NextResponse.json(
    { userIds },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
