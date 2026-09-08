import { NextResponse } from "next/server";
import { isOpaqueTokenShape } from "@/lib/email-campaigns/tokens";
import { recordClickByToken } from "@/lib/email-campaigns/store";
import { checkRateLimitShared } from "@/lib/security/rate-limit";
import { getSiteOrigin } from "@/lib/site-url";

type RouteContext = { params: Promise<{ token: string }> };

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET(request: Request, context: RouteContext) {
  const limit = await checkRateLimitShared("email_campaign_track", `click:${clientIp(request)}`);
  if (!limit.ok) {
    return NextResponse.redirect(getSiteOrigin(), 302);
  }

  const { token } = await context.params;
  if (!isOpaqueTokenShape(token) || token.startsWith("preview-")) {
    return NextResponse.redirect(getSiteOrigin(), 302);
  }

  const recorded = await recordClickByToken(token);
  if (!recorded) {
    return NextResponse.redirect(getSiteOrigin(), 302);
  }
  return NextResponse.redirect(recorded.destinationUrl, 302);
}
