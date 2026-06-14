"use server";

import { sendContactFormEmail } from "@/lib/contact-email";
import { assertRateLimit } from "@/lib/security";
import { buildPhoneE164, normalizeDialCode, normalizeNationalDigits } from "@/lib/phone-eu";
import { headers } from "next/headers";

export type SubmitContactFormInput = {
  fullName: string;
  email: string;
  phoneDial?: string;
  phoneNational?: string;
  subject: string;
  message: string;
};

export type SubmitContactFormResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "rate_limit" | "send_failed" | "no_api_key";
      message?: string;
    };

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function rateLimitIdentity(fallbackEmail: string): Promise<string> {
  const hdrs = await headers();
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip")?.trim() ||
    fallbackEmail
  );
}

export async function submitContactFormAction(
  input: SubmitContactFormInput,
): Promise<SubmitContactFormResult> {
  const fullName = input.fullName?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const subject = input.subject?.trim() ?? "";
  const message = input.message?.trim() ?? "";

  if (!fullName || !email || !subject || !message) {
    return { ok: false, error: "validation" };
  }

  if (!isValidEmail(email)) {
    return { ok: false, error: "validation" };
  }

  const dial = normalizeDialCode(input.phoneDial);
  const national = normalizeNationalDigits(input.phoneNational ?? "");
  const phone = national ? buildPhoneE164(dial, national) : null;

  try {
    assertRateLimit("contact_form", await rateLimitIdentity(email));
  } catch (err) {
    return {
      ok: false,
      error: "rate_limit",
      message: err instanceof Error ? err.message : undefined,
    };
  }

  const result = await sendContactFormEmail({
    fullName,
    email,
    phone,
    subject,
    message,
  });

  if (!result.ok) {
    return { ok: false, error: result.reason };
  }

  return { ok: true };
}
