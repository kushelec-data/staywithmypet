"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { PhoneCountryFields } from "@/components/profile/PhoneCountryFields";
import { useLanguage } from "@/context/LanguageContext";
import { DEFAULT_PHONE_DIAL_CODE } from "@/lib/phone-eu";
import { useState } from "react";

export function ContactPageClient() {
  const { t } = useLanguage();
  const c = t.contact;
  const [phoneDial, setPhoneDial] = useState(DEFAULT_PHONE_DIAL_CODE);
  const [phoneNat, setPhoneNat] = useState("");

  return (
    <>
      <PageHeader badge={c.badge} title={c.title} description={c.subtitle} />

      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <form className="card-elevated space-y-5 rounded-2xl p-6 sm:space-y-6 sm:rounded-3xl sm:p-8 lg:p-10">
          <div>
            <label htmlFor="full_name" className="text-sm font-medium text-foreground">
              {c.fullName}
            </label>
            <input id="full_name" name="full_name" type="text" required className="input-field mt-1" />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              {c.email}
            </label>
            <input id="email" name="email" type="email" required className="input-field mt-1" />
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
          <input type="hidden" name="phone_dial" value={phoneDial} readOnly />
          <input type="hidden" name="phone_national" value={phoneNat} readOnly />
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
            <textarea id="message" name="message" rows={5} required className="input-field mt-1 resize-y" />
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            {t.common.sendMessage}
          </Button>
        </form>
      </section>
    </>
  );
}
