import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/lib/security/same-origin";
import { ACTIVITY_EVENT_TYPES, trackActivity, type ActivityEventType } from "@/lib/activity/track";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    eventType?: string;
    pagePath?: string;
    entityType?: string;
    entityId?: string;
    sessionId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!ACTIVITY_EVENT_TYPES.includes(body.eventType as ActivityEventType)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const result = await trackActivity(supabase, {
    userId: user.id,
    eventType: body.eventType as ActivityEventType,
    pagePath: body.pagePath ?? null,
    entityType: body.entityType ?? null,
    entityId: body.entityId ?? null,
    sessionId: body.sessionId ?? null,
  });

  return NextResponse.json({ ok: result.ok });
}
