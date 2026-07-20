"use client";

import { subscribeNewsletterAction } from "@/app/actions/newsletter";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { PAGE_CONTAINER } from "@/lib/layout";
import { STATUS_ALERT_ERROR_CLASS, STATUS_ALERT_SUCCESS_CLASS } from "@/lib/status-colors";
import { useState, type FormEvent } from "react";

export function NewsletterSignupCard() {
  const { t } = useLanguage();
  const n = t.contact.newsletter;
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    setError(null);

    const value = email.trim();
    if (!value) {
      setError(n.requiredEmail);
      setSubmitting(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError(n.invalidEmail);
      setSubmitting(false);
      return;
    }

    try {
      const result = await subscribeNewsletterAction(value);

      if (result.ok) {
        setSuccess(true);
        setEmail("");
        return;
      }

      if (result.error === "validation") {
        setError(result.validationField === "invalid" ? n.invalidEmail : n.requiredEmail);
        return;
      }

      if (result.error === "rate_limit" && result.message) {
        setError(result.message);
        return;
      }

      setError(n.errorMessage);
    } catch {
      setError(n.errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`${PAGE_CONTAINER} pb-10 pt-2 sm:pb-14 sm:pt-4`} aria-labelledby="newsletter-heading">
      <div className="w-full rounded-2xl border-[2.5px] border-brand-teal/30 bg-gradient-to-br from-mint/45 via-mint/30 to-cream/50 p-8 shadow-sm sm:rounded-3xl sm:p-10 lg:p-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="newsletter-heading"
            className="font-heading text-xl font-semibold leading-snug text-foreground sm:text-2xl lg:text-[1.75rem]"
          >
            {n.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:mt-4 sm:text-base">
            {n.description}
          </p>

          {success ? (
            <p className={`${STATUS_ALERT_SUCCESS_CLASS} mt-6 text-left sm:mt-8`} role="status">
              {n.successMessage}
            </p>
          ) : (
            <form
              className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-end sm:justify-center sm:gap-4"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="min-w-0 flex-1 text-left sm:max-w-md">
                <label htmlFor="newsletter-email" className="sr-only">
                  {n.emailLabel}
                </label>
                <input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder={n.emailPlaceholder}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input-field w-full"
                  disabled={submitting}
                />
              </div>
              <Button type="submit" size="lg" className="shrink-0 sm:min-w-[9.5rem]" disabled={submitting}>
                {submitting ? t.common.loading : n.subscribe}
              </Button>
            </form>
          )}

          {error ? (
            <p className={`${STATUS_ALERT_ERROR_CLASS} mt-4 text-left`} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
