import { MessageSquare } from "lucide-react";
import Link from "next/link";

type RequestMessagePreviewProps = {
  label: string;
  message: string;
  className?: string;
  href?: string | null;
};

export function RequestMessagePreview({
  label,
  message,
  className,
  href,
}: RequestMessagePreviewProps) {
  const content = (
    <>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <MessageSquare className="h-4 w-4 shrink-0 text-brand-teal" strokeWidth={2} aria-hidden />
        <span>{label}</span>
      </div>
      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-foreground/85 break-words">
        {message}
      </p>
    </>
  );

  const shellClass = [
    "rounded-2xl border border-black/[0.06] bg-cream/50 px-3 py-2.5 sm:bg-mint/20 dark:border-border",
    href ? "transition-colors hover:border-brand-teal/30 hover:bg-mint/25" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={`block min-w-0 ${shellClass}`}>
        {content}
      </Link>
    );
  }

  return <div className={shellClass}>{content}</div>;
}
