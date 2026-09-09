import Link from "next/link";
import type { ReactNode } from "react";
import { ChartNoAxesCombined } from "lucide-react";
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
  actions,
  children,
  compact = false,
}: {
  title: string;
  description?: string;
  pathname: string;
  actions?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  const shell = compact
    ? "account-area mx-auto w-full min-w-0 max-w-4xl px-4 sm:px-6 py-6"
    : `${ACCOUNT_LAYOUT_SHELL} py-8`;
  const nav = (
    <nav className={`flex flex-wrap gap-1.5 ${compact ? "" : "mt-6 gap-2"}`} aria-label="Admin">
      {ADMIN_NAV.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-semibold ${compact ? "px-2.5 py-1" : "px-3 py-1.5"} ${active ? ACCOUNT_NAV_ACTIVE_CLASS : ACCOUNT_NAV_INACTIVE_CLASS}`}
          >
            {item.href === "/admin/analytics" ? (
              <ChartNoAxesCombined className="h-4 w-4 shrink-0" aria-hidden />
            ) : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className={shell}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#2E6B3F]">Internal</p>
          <h1 className={compact ? "font-heading text-2xl font-semibold text-foreground" : ACCOUNT_PAGE_TITLE}>{title}</h1>
          {description ? <p className={compact ? "mt-1 max-w-xl text-sm text-muted" : ACCOUNT_PAGE_DESCRIPTION}>{description}</p> : null}
        </div>
        {actions}
      </div>
      {compact ? <div className={`${ACCOUNT_CARD_CLASS} mt-4 p-3`}>{nav}</div> : nav}
      <div className={compact ? "mt-5 space-y-4" : "mt-8"}>{children}</div>
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
