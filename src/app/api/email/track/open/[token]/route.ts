import { NextResponse } from "next/server";
import { isOpaqueTokenShape } from "@/lib/email-campaigns/tokens";
import { recordOpenByToken } from "@/lib/email-campaigns/store";
import { checkRateLimitShared, rateLimitMessage } from "@/lib/security/rate-limit";

type RouteContext = { params: Promise<{ token: string }> };

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET(request: Request, context: RouteContext) {
  const limit = await checkRateLimitShared("email_campaign_track", clientIp(request));
  if (!limit.ok) {
    return new NextResponse(PIXEL, {
      status: 429,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Retry-After": String(limit.retryAfterSec),
        "X-RateLimit-Message": rateLimitMessage(limit.retryAfterSec),
      },
    });
  }

  const { token } = await context.params;
  if (isOpaqueTokenShape(token) && !token.startsWith("preview-")) {
    await recordOpenByToken(token);
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Content-Length": String(PIXEL.length),
    },
  });
}
