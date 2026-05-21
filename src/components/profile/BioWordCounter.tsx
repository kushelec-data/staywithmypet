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
  return (
    <div id={id} className="mt-1.5" aria-live="polite">
      <p className={`text-xs font-medium ${bioCounterTextClass(status)}`}>
        {wordCount} / {BIO_WORD_MAX} words
      </p>
      {wordCount < BIO_WORD_MIN ? (
        <p className="mt-0.5 text-xs text-brand-pink">Write at least 20 words.</p>
      ) : null}
      {status === "too_many" ? (
        <p className="mt-0.5 text-xs text-brand-pink">Bio cannot exceed {BIO_WORD_MAX} words.</p>
      ) : null}
    </div>
  );
}
