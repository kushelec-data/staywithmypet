import {
  isInternalSecretAuthorized,
  type InternalSecretAuthOptions,
} from "@/lib/security/internal-secret-auth";
import { NextResponse } from "next/server";

/**
 * Shared GET+POST wrapper for Vercel Cron.
 * Vercel Cron always sends HTTP GET with `Authorization: Bearer CRON_SECRET`.
 */
export function createCronHandlers(
  execute: (request: Request) => Promise<Response>,
  options: InternalSecretAuthOptions = {},
) {
  async function handle(request: Request): Promise<Response> {
    if (!isInternalSecretAuthorized(request, options)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return execute(request);
  }

  return { GET: handle, POST: handle };
}
