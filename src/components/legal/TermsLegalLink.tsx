import Link from "next/link";
import type { ReactNode } from "react";

type TermsLegalLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function TermsLegalLink({ href, children, className = "" }: TermsLegalLinkProps) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-semibold text-brand-teal underline underline-offset-2 hover:text-brand-pink ${className}`}
    >
      {children}
    </Link>
  );
}
