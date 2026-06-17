"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  BIO_WORD_EXCELLENT_MIN,
  BIO_WORD_MAX,
  BIO_WORD_MIN,
  bioCounterClass,
  getWordCount,
} from "@/lib/bio-words";

type BioWordCounterProps = {
  /** Bio text — word count is derived live from this value. */
  bio: string;
  id?: string;
};

export function BioWordCounter({ bio, id }: BioWordCounterProps) {
  const { t } = useLanguage();
  const basic = t.profileEdit.basic;
  const wordCount = getWordCount(bio);
  const counterClass = bioCounterClass(wordCount);

  return (
    <div id={id} className="mt-3 space-y-1" aria-live="polite">
      <p className={`text-sm font-semibold ${counterClass}`}>
        {basic.bioWordCount
          .replace("{count}", String(wordCount))
          .replace("{max}", String(BIO_WORD_MAX))}
      </p>

      {wordCount < BIO_WORD_MIN ? (
        <p className="text-sm text-red-500">{basic.errorBioMin}</p>
      ) : null}

      {wordCount >= BIO_WORD_MIN && wordCount < BIO_WORD_EXCELLENT_MIN ? (
        <p className="text-sm text-green-600">{basic.bioDescriptionGood}</p>
      ) : null}

      {wordCount >= BIO_WORD_EXCELLENT_MIN && wordCount <= BIO_WORD_MAX ? (
        <p className="text-sm text-amber-600">{basic.bioDescriptionExcellent}</p>
      ) : null}

      {wordCount > BIO_WORD_MAX ? (
        <p className="text-sm text-red-500">
          {basic.errorBioMax.replace("{max}", String(BIO_WORD_MAX))}
        </p>
      ) : null}
    </div>
  );
}
