import Link from "next/link";
import type { ReactNode } from "react";
import { ADMIN_NAV } from "@/lib/admin/nav";
import {
  ACCOUNT_CARD_CLASS,
  ACCOUNT_LAYOUT_SHELL,
  ACCOUNT_NAV_ACTIVE_CLASS,
  ACCOUNT_NAV_INACTIVE_CLASS,
  ACCOUNT_PAGE_DESCRIPTION,
  ACCOUNT_PAGE_TITLE,
} from "@/lib/account-ui";

export function AdminShell({
  title,
  description,
  pathname,
  children,
}: {
  title: string;
  description?: string;
  pathname: string;
  children: ReactNode;
}) {
  return (
    <div className={`${ACCOUNT_LAYOUT_SHELL} py-8`}>
      <p className="text-sm font-semibold uppercase tracking-wider text-[#2E6B3F]">Internal</p>
      <h1 className={ACCOUNT_PAGE_TITLE}>{title}</h1>
      {description ? <p className={ACCOUNT_PAGE_DESCRIPTION}>{description}</p> : null}
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Admin">
        {ADMIN_NAV.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 text-sm font-semibold ${active ? ACCOUNT_NAV_ACTIVE_CLASS : ACCOUNT_NAV_INACTIVE_CLASS}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${ACCOUNT_CARD_CLASS} p-5 ${className}`}>{children}</div>;
}

export function AdminTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: ReactNode[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-[20px] border border-[#E5E2D8]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#DDEEDF] text-xs uppercase tracking-wide text-[#2E6B3F]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-[#E5E2D8] bg-[#F8F6F1]">
              {row.map((cell, j) => (
                <td key={j} className="whitespace-nowrap px-3 py-2 align-top text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPager({
  page,
  pageSize,
  total,
  href,
}: {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center gap-3 text-sm">
      {page > 1 ? <Link href={href(page - 1)} className="font-semibold text-[#2E6B3F]">Previous</Link> : null}
      <span className="text-muted">
        Page {page} of {pages} ({total})
      </span>
      {page < pages ? <Link href={href(page + 1)} className="font-semibold text-[#2E6B3F]">Next</Link> : null}
    </div>
  );
}
