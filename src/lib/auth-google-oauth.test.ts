import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveLoginReturnPath } from "@/lib/auth-routing";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Google OAuth", () => {
  const assignMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("window", {
      location: { assign: assignMock, origin: "https://staywithmypet.ee" },
    });
    assignMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("calls signInWithOAuth with provider google and callback redirect URL", async () => {
    const signInWithOAuth = vi.fn(async () => ({
      data: { provider: "google", url: "https://example.supabase.co/auth/v1/authorize?provider=google" },
      error: null,
    }));

    vi.doMock("@/lib/site-url", () => ({
      getAuthRedirectOrigin: () => "https://staywithmypet.ee",
    }));

    const { getAuthCallbackUrl, startGoogleOAuth } = await import("@/lib/auth");
    const nextPath = "/dashboard";
    expect(getAuthCallbackUrl(nextPath)).toBe(
      "https://staywithmypet.ee/auth/callback?next=%2Fdashboard",
    );

    const result = await startGoogleOAuth({ auth: { signInWithOAuth } } as never, nextPath);

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://staywithmypet.ee/auth/callback?next=%2Fdashboard",
        queryParams: {
          prompt: "select_account consent",
          access_type: "offline",
        },
      },
    });
    expect(result.error).toBeNull();
    expect(result.redirectUrl).toContain("/auth/v1/authorize");
    expect(assignMock).toHaveBeenCalledWith(result.redirectUrl);
  });

  it("returns Supabase errors instead of swallowing them", async () => {
    const signInWithOAuth = vi.fn(async () => ({
      data: { provider: "google", url: null },
      error: new Error("Provider not enabled"),
    }));

    vi.doMock("@/lib/site-url", () => ({
      getAuthRedirectOrigin: () => "https://staywithmypet.ee",
    }));

    const { startGoogleOAuth } = await import("@/lib/auth");
    const result = await startGoogleOAuth({ auth: { signInWithOAuth } } as never, "/dashboard");

    expect(result.redirectUrl).toBeNull();
    expect(result.error?.message).toBe("Provider not enabled");
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("rejects unsafe external returnTo paths", () => {
    expect(resolveLoginReturnPath("https://evil.test")).toBeNull();
    expect(resolveLoginReturnPath("//evil.test/path")).toBeNull();
    expect(resolveLoginReturnPath("/dashboard")).toBe("/dashboard");
  });

  it("uses startGoogleOAuth from AuthForm and surfaces oauth errors", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain("startGoogleOAuth");
    expect(source).toContain("onClick={handleGoogle}");
    expect(source).toContain('type="button"');
    expect(source).toContain("setError(formatAuthError(err, authMessages))");
    expect(source).not.toContain("signInWithOAuth");
  });

  it("keeps Google auth independent of analytics consent", () => {
    const authSource = readSource("src/components/auth/AuthForm.tsx");
    const gaSource = readSource("src/components/cookies/ConsentAwareGoogleAnalytics.tsx");
    expect(authSource).not.toContain("readCookieConsent");
    expect(authSource).not.toContain("cookie-consent");
    expect(gaSource).toContain("consent?.analytics === true");
  });

  it("documents callback route and post-login routing", () => {
    const callbackSource = readSource("src/app/auth/callback/route.ts");
    expect(callbackSource).toContain("createRouteHandlerClient");
    expect(callbackSource).toContain("exchangeCodeForSession");
    expect(callbackSource).toContain("ensureOAuthProfile");
    expect(callbackSource).toContain("resolvePostLoginPath");
    expect(callbackSource).toContain('redirectTo("/login?error=auth")');
  });

  it("keeps Google button enabled on login and gated by terms on signup only", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain('disabled={loading || (isSignup && !termsAccepted)}');
    expect(source).toMatch(/type="submit"[\s\S]*disabled=\{loading\}/);
    expect(source).toContain("{t.auth.continueWithGoogle}");
  });
});

describe("createClient browser singleton", () => {
  const createBrowserClientMock = vi.fn(() => ({ tag: "browser-client" }));

  beforeEach(() => {
    vi.resetModules();
    createBrowserClientMock.mockClear();
    vi.stubGlobal("window", undefined);
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    const mod = await import("@/lib/supabase");
    mod.__resetBrowserClientForTests();
  });

  it("does not cache SSR clients in the browser singleton", async () => {
    vi.doMock("@supabase/ssr", () => ({
      createBrowserClient: (...args: unknown[]) => createBrowserClientMock(...args),
    }));
    vi.doMock("@/lib/supabase/env", () => ({
      assertSupabasePublicEnv: () => ({
        url: "https://example.supabase.co",
        anonKey: "anon-key",
      }),
    }));

    const { createClient, __resetBrowserClientForTests } = await import("@/lib/supabase");
    __resetBrowserClientForTests();

    createClient();
    expect(createBrowserClientMock).toHaveBeenCalledTimes(1);

    vi.stubGlobal("window", { location: { origin: "https://staywithmypet.ee" } });
    createClient();
    createClient();
    expect(createBrowserClientMock).toHaveBeenCalledTimes(2);
  });
});
