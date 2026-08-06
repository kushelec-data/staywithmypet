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

  it("keeps the email submit button enabled so terms validation can show feedback", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain('type="submit"');
    expect(source).toMatch(/type="submit"[\s\S]*disabled=\{loading\}/);
    expect(source).not.toMatch(
      /type="submit"[\s\S]*disabled=\{loading \|\| \(isSignup && !termsAccepted\)\}/,
    );
  });

  it("shows inline terms error beside the checkbox when signup is submitted without acceptance", () => {
    const authForm = readSource("src/components/auth/AuthForm.tsx");
    const checkbox = readSource("src/components/legal/TermsAcceptanceCheckbox.tsx");
    const en = readSource("src/i18n/en.ts");

    expect(authForm).toContain("if (!termsAccepted)");
    expect(authForm).toContain("setTermsError(t.termsAcceptance.errors.signupAcceptanceRequired)");
    expect(authForm).toContain("focusSignupTermsField()");
    expect(authForm).toContain("error={termsError}");
    expect(authForm).toContain("invalid={Boolean(termsError)}");
    expect(checkbox).toContain('role="alert"');
    expect(checkbox).toContain("border-red-600");
    expect(en).toContain(
      "Please accept the Terms of Service and Privacy Policy to create your account.",
    );
  });

  it("clears the inline terms error after the checkbox is checked", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain("handleTermsAcceptedChange");
    expect(source).toMatch(/if \(checked\) \{[\s\S]*setTermsError\(null\)/);
  });

  it("still disables the submit button only while loading", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toMatch(/<Button type="submit"[\s\S]*disabled=\{loading\}/);
    expect(source).toContain("setLoading(true)");
    expect(source).toContain("setLoading(false)");
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

describe("Google OAuth unchanged", () => {
  it("still gates Google signup on terms acceptance in the click handler", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain("startGoogleOAuth");
    expect(source).toContain("disabled={loading || (isSignup && !termsAccepted)}");
    expect(source).toContain("if (isSignup && !termsAccepted)");
  });
});
