"use client";

import { useLanguage } from "@/context/LanguageContext";

export function FaqAccordion() {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {t.faq.items.map((item) => (
        <details
          key={item.question}
          className="group card-elevated rounded-2xl bg-surface px-6 py-2 open:ring-1 open:ring-brand-pink/20"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-heading text-lg font-semibold text-foreground marker:content-none">
            {item.question}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint/60 text-brand-teal transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="border-t border-black/5 pb-5 pt-2 text-base leading-relaxed text-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
