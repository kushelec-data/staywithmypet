import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("OAuth callback route handler client", () => {
  it("uses a route-handler Supabase client that writes cookies onto redirects", () => {
    const callbackSource = readSource("src/app/auth/callback/route.ts");
    const routeHandlerSource = readSource("src/lib/supabase/route-handler.ts");

    expect(callbackSource).toContain("createRouteHandlerClient");
    expect(callbackSource).not.toContain('@/lib/supabase/server"');
    expect(callbackSource).toContain("exchangeCodeForSession");
    expect(routeHandlerSource).toContain("response.cookies.set");
    expect(routeHandlerSource).toContain("request.cookies.getAll");
  });
});
