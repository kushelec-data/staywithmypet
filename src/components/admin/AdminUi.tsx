import Link from "next/link";
import type { ReactNode } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { ADMIN_NAV } from "@/lib/admin/nav";
import {
  ACCOUNT_CARD_CLASS,
  ACCOUNT_NAV_ACTIVE_CLASS,
  ACCOUNT_NAV_INACTIVE_CLASS,
} from "@/lib/account-ui";

export function AdminShell({
  title,
  description,
  pathname,
  actions,
  children,
}: {
  title: string;
  description?: string;
  pathname: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="account-area mx-auto w-full min-w-0 max-w-4xl px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#2E6B3F]">Internal</p>
          <h1 className="font-heading text-xl font-semibold text-foreground sm:text-2xl">{title}</h1>
          {description ? <p className="mt-1 max-w-xl text-sm text-muted">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className={`${ACCOUNT_CARD_CLASS} mt-3 p-2`}>
        <nav className="flex flex-wrap gap-1" aria-label="Admin">
          {ADMIN_NAV.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-sm font-semibold ${active ? ACCOUNT_NAV_ACTIVE_CLASS : ACCOUNT_NAV_INACTIVE_CLASS}`}
              >
                {item.href === "/admin/analytics" ? (
                  <ChartNoAxesCombined className="h-4 w-4 shrink-0" aria-hidden />
                ) : null}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
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
