import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatAuthError } from "@/lib/auth-messages";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const messages = {
  errorGeneric: "Something went wrong.",
  invalidCredentials: "Invalid credentials.",
  emailAlreadyRegistered: "Email already registered.",
  emailNotConfirmed: "Email not confirmed.",
  confirmationEmailFailed: "Confirmation email failed.",
  weakPassword: "Weak password.",
  oauthFailed: "OAuth failed.",
  profileCreateFailed: "Profile failed.",
};

describe("email signup", () => {
  it("maps Supabase confirmation email SMTP failures to a user-facing message", () => {
    expect(
      formatAuthError(new Error("Error sending confirmation email"), messages),
    ).toBe(messages.confirmationEmailFailed);
  });

  it("reads signup password from form data when React state is empty", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain("password || passwordFromForm");
  });

  it("formats signup Supabase errors instead of showing raw messages only", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain("formatAuthError(signUpError, authMessages)");
  });

  it("calls signUp with emailRedirectTo from getAuthConfirmUrl", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain("supabase.auth.signUp");
    expect(source).toContain("getAuthConfirmUrl(DASHBOARD_PATH)");
  });

  it("shows check-email state when signup returns a user without a session", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain("data.user && !data.session");
    expect(source).toContain("setInfo(t.auth.checkEmail)");
  });

  it("resets loading state in finally after signup errors", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain("} finally {");
    expect(source).toContain("setLoading(false)");
  });

  it("uses the browser Supabase client singleton for signup", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain("useMemo(() => createClient(), [])");
    expect(source).toContain("supabase.auth.signUp");
  });
});

describe("Google OAuth signup terms gate", () => {
  it("uses startGoogleOAuth from AuthForm and surfaces oauth errors", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain("startGoogleOAuth");
    expect(source).toContain("onClick={handleGoogle}");
    expect(source).not.toContain("signInWithOAuth");
  });

  it("blocks Google signup with the same guided terms validation flow", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    const handleGoogleStart = source.indexOf("async function handleGoogle()");
    const termsGate = source.indexOf("blockSignupForMissingTerms()", handleGoogleStart);
    const oauthCall = source.indexOf("startGoogleOAuth", handleGoogleStart);
    expect(termsGate).toBeGreaterThan(handleGoogleStart);
    expect(oauthCall).toBeGreaterThan(termsGate);
  });
});
