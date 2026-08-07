import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  focusSignupTermsCheckbox,
  focusSignupTermsField,
  prefersReducedMotion,
  scrollSignupTermsIntoView,
  shouldApplyTermsShake,
} from "@/lib/signup-terms-validation";

function readSource(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("signup terms validation helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("scrolls the terms section into view centered", () => {
    const scrollIntoView = vi.fn();
    scrollSignupTermsIntoView({ scrollIntoView } as unknown as HTMLElement);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("focuses the checkbox after the next animation frame", () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    const focus = vi.fn();
    focusSignupTermsCheckbox({ focus } as unknown as HTMLInputElement);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("scrolls then focuses via focusSignupTermsField", () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    const scrollIntoView = vi.fn();
    const focus = vi.fn();
    focusSignupTermsField(
      { scrollIntoView } as unknown as HTMLElement,
      { focus } as unknown as HTMLInputElement,
    );
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("respects prefers-reduced-motion for shake", () => {
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: true }),
    });
    expect(prefersReducedMotion()).toBe(true);
    expect(shouldApplyTermsShake()).toBe(false);
  });

  it("allows shake when motion is not reduced", () => {
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false }),
    });
    expect(prefersReducedMotion()).toBe(false);
    expect(shouldApplyTermsShake()).toBe(true);
  });
});

describe("signup terms guided validation UI", () => {
  it("keeps Create account clickable when Terms are unchecked", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toMatch(/<Button type="submit"[\s\S]*disabled=\{loading\}/);
    expect(source).not.toMatch(
      /type="submit"[\s\S]*disabled=\{loading \|\| \(isSignup && !termsAccepted\)\}/,
    );
  });

  it("keeps Google signup clickable when Terms are unchecked", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toContain("{t.auth.continueWithGoogle}");
    expect(source).toMatch(/onClick=\{handleGoogle\}/);
    expect(source).toMatch(/disabled=\{loading\}/);
    expect(source).not.toContain("disabled={loading || (isSignup && !termsAccepted)}");
  });

  it("blocks email signup before Supabase signUp when Terms are unchecked", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    const termsGate = source.indexOf("if (isSignup && !termsAccepted)");
    const signUpCall = source.indexOf("supabase.auth.signUp");
    expect(termsGate).toBeGreaterThan(-1);
    expect(signUpCall).toBeGreaterThan(termsGate);
    expect(source).toContain("blockSignupForMissingTerms()");
  });

  it("blocks Google OAuth before startGoogleOAuth when Terms are unchecked", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    const handleGoogleStart = source.indexOf("async function handleGoogle()");
    const handleGoogleTermsGate = source.indexOf("if (isSignup && !termsAccepted)", handleGoogleStart);
    const handleGoogleBlock = source.indexOf("blockSignupForMissingTerms()", handleGoogleStart);
    const handleGoogleOAuth = source.indexOf("startGoogleOAuth", handleGoogleStart);
    expect(handleGoogleTermsGate).toBeGreaterThan(handleGoogleStart);
    expect(handleGoogleBlock).toBeGreaterThan(handleGoogleTermsGate);
    expect(handleGoogleOAuth).toBeGreaterThan(handleGoogleBlock);
  });

  it("scrolls, focuses, and shows the inline terms error on blocked actions", () => {
    const authForm = readSource("src/components/auth/AuthForm.tsx");
    const checkbox = readSource("src/components/legal/TermsAcceptanceCheckbox.tsx");
    const helpers = readSource("src/lib/signup-terms-validation.ts");
    const en = readSource("src/i18n/en.ts");

    expect(authForm).toContain("focusSignupTermsField(termsContainerRef.current, termsCheckboxRef.current)");
    expect(authForm).toContain("setTermsError(t.termsAcceptance.errors.signupAcceptanceRequired)");
    expect(authForm).toContain("error={termsError}");
    expect(helpers).toContain('behavior: "smooth"');
    expect(helpers).toContain('block: "center"');
    expect(checkbox).toContain('role="alert"');
    expect(checkbox).toContain("aria-describedby={error ? errorId : undefined}");
    expect(checkbox).toContain('aria-invalid={showInvalid || undefined}');
    expect(en).toContain(
      "Please accept the Terms of Service and Privacy Policy to continue.",
    );
  });

  it("applies shake and highlight classes on the Terms block", () => {
    const authForm = readSource("src/components/auth/AuthForm.tsx");
    const checkbox = readSource("src/components/legal/TermsAcceptanceCheckbox.tsx");
    const css = readSource("src/app/globals.css");

    expect(authForm).toContain("termsShaking");
    expect(authForm).toContain("triggerTermsShake");
    expect(checkbox).toContain("TERMS_ACCEPTANCE_SHAKE_CLASS");
    expect(checkbox).toContain("TERMS_ACCEPTANCE_HIGHLIGHT_CLASS");
    expect(checkbox).toContain("TERMS_SHAKE_ANIMATION_NAME");
    expect(css).toContain("@keyframes terms-acceptance-shake");
    expect(css).toContain("translateX(-6px)");
    expect(css).toContain("translateX(6px)");
    expect(css).toContain(".terms-acceptance-highlight");
  });

  it("clears error, highlight, and shake after Terms are checked", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toMatch(/if \(checked\) \{[\s\S]*setTermsError\(null\)[\s\S]*setTermsShaking\(false\)/);
  });

  it("skips shake animation when prefers-reduced-motion is enabled", () => {
    const authForm = readSource("src/components/auth/AuthForm.tsx");
    const css = readSource("src/app/globals.css");
    expect(authForm).toContain("shouldApplyTermsShake()");
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*\.terms-acceptance-shake[\s\S]*animation: none/);
  });

  it("still disables buttons only while loading", () => {
    const source = readSource("src/components/auth/AuthForm.tsx");
    expect(source).toMatch(/<Button type="submit"[\s\S]*disabled=\{loading\}/);
    expect(source).toMatch(/onClick=\{handleGoogle\}/);
    expect(source).toMatch(/disabled=\{loading\}/);
    expect(source).toContain("setLoading(true)");
    expect(source).toContain("setLoading(false)");
  });
});
