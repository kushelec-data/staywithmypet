"use client";

import { STATUS_ALERT_ERROR_CLASS, STATUS_ALERT_SUCCESS_CLASS } from "@/lib/status-colors";
import { submitContactFormAction } from "@/app/actions/contact";
import { NewsletterSignupCard } from "@/components/contact/NewsletterSignupCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { PhoneCountryFields } from "@/components/profile/PhoneCountryFields";
import { useLanguage } from "@/context/LanguageContext";
import { DEFAULT_PHONE_DIAL_CODE } from "@/lib/phone-eu";
import { useState, type FormEvent } from "react";

export function ContactPageClient() {
  const { t } = useLanguage();
  const c = t.contact;
  const [phoneDial, setPhoneDial] = useState(DEFAULT_PHONE_DIAL_CODE);
  const [phoneNat, setPhoneNat] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const fullName = String(data.get("full_name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const subject = String(data.get("subject") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (!fullName || !email || !subject || !message) {
      setError(c.errorMessage);
      setSubmitting(false);
      return;
    }

    try {
      const result = await submitContactFormAction({
        fullName,
        email,
        phoneDial,
        phoneNational: phoneNat,
        subject,
        message,
      });

      if (result.ok) {
        setSuccess(true);
        form.reset();
        setPhoneDial(DEFAULT_PHONE_DIAL_CODE);
        setPhoneNat("");
        return;
      }

      if (result.error === "rate_limit" && result.message) {
        setError(result.message);
        return;
      }

      setError(c.errorMessage);
    } catch {
      setError(c.errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader badge={c.badge} title={c.title} description={c.subtitle} />

      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <form
          className="card-elevated space-y-5 rounded-2xl p-6 sm:space-y-6 sm:rounded-3xl sm:p-8 lg:p-10"
          onSubmit={handleSubmit}
          noValidate
        >
          {success ? (
            <p
              className={STATUS_ALERT_SUCCESS_CLASS}
              role="status"
            >
              {c.successMessage}
            </p>
          ) : null}

          {error ? (
            <p
              className={STATUS_ALERT_ERROR_CLASS}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div>
            <label htmlFor="full_name" className="text-sm font-medium text-foreground">
              {c.fullName}
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              autoComplete="name"
              className="input-field mt-1"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              {c.email}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input-field mt-1"
            />
          </div>
          <PhoneCountryFields
            idPrefix="contact"
            label={`${c.phone} (${c.phoneOptional})`}
            dialCode={phoneDial}
            nationalNumber={phoneNat}
            onDialCodeChange={setPhoneDial}
            onNationalChange={setPhoneNat}
            hint={c.phoneHint}
          />
          <div>
            <label htmlFor="subject" className="text-sm font-medium text-foreground">
              {c.subject}
            </label>
            <input id="subject" name="subject" type="text" required className="input-field mt-1" />
          </div>
          <div>
            <label htmlFor="message" className="text-sm font-medium text-foreground">
              {c.message}
            </label>
            <AutoResizeTextarea
              id="message"
              name="message"
              minRows={5}
              required
              className="input-field mt-1"
            />
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
            {submitting ? t.common.loading : t.common.sendMessage}
          </Button>
        </form>
      </section>

      <NewsletterSignupCard />
    </>
  );
}
