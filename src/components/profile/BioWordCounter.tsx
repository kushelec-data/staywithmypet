"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  BIO_WORD_MAX,
  BIO_WORD_MIN,
  bioCounterTextClass,
  type BioWordStatus,
} from "@/lib/bio-words";

type BioWordCounterProps = {
  wordCount: number;
  status: BioWordStatus;
  id?: string;
};

export function BioWordCounter({ wordCount, status, id }: BioWordCounterProps) {
  const { t } = useLanguage();
  const basic = t.profileEdit.basic;

  return (
    <div id={id} className="mt-1.5" aria-live="polite">
      <p className={`text-xs font-medium ${bioCounterTextClass(status)}`}>
        {basic.bioWordCount
          .replace("{count}", String(wordCount))
          .replace("{max}", String(BIO_WORD_MAX))}
      </p>
      {wordCount < BIO_WORD_MIN ? (
        <p className="mt-0.5 text-xs text-brand-pink">{basic.errorBioMin}</p>
      ) : null}
      {status === "too_many" ? (
        <p className="mt-0.5 text-xs text-brand-pink">
          {basic.errorBioMax.replace("{max}", String(BIO_WORD_MAX))}
        </p>
      ) : null}
    </div>
  );
}
