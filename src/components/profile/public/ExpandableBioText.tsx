"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useLayoutEffect, useRef, useState } from "react";

type ExpandableBioTextProps = {
  bio: string;
  className?: string;
  textClassName?: string;
  /** Collapsed line count — defaults to 3. */
  collapsedLines?: 2 | 3;
};

const LINE_CLAMP_CLASS = {
  2: "line-clamp-2",
  3: "line-clamp-3",
} as const;

export function ExpandableBioText({
  bio,
  className = "",
  textClassName = "text-sm leading-relaxed text-foreground/90",
  collapsedLines = 3,
}: ExpandableBioTextProps) {
  const { t } = useLanguage();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    setExpanded(false);
  }, [bio]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;

    function measure() {
      if (!el) return;
      setTruncated(el.scrollHeight > el.clientHeight + 1);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [bio, expanded, collapsedLines]);

  const showToggle = truncated || expanded;
  const lineClamp = expanded ? "" : LINE_CLAMP_CLASS[collapsedLines];

  return (
    <div className={className}>
      <div
        className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          expanded ? "max-h-[2000px]" : ""
        }`}
      >
        <p
          ref={textRef}
          className={`${textClassName} ${lineClamp} break-words whitespace-pre-wrap transition-[opacity] duration-200`}
        >
          {bio}
        </p>
      </div>
      {showToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 text-left text-xs font-semibold text-brand-teal hover:text-brand-teal-hover hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
          aria-expanded={expanded}
        >
          {expanded ? t.publicProfileUi.showLess : t.publicProfileUi.readMore}
        </button>
      ) : null}
    </div>
  );
}
