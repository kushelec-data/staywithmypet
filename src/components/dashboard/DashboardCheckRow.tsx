"use client";

import Link from "next/link";
import {
  STATUS_CHECK_COMPLETE_CLASS,
  STATUS_CHECK_MISSING_CLASS,
  STATUS_CHECK_PENDING_CLASS,
  STATUS_CHECK_PENDING_TEXT_CLASS,
} from "@/lib/status-colors";
import { DASHBOARD_LINK_CLASS } from "@/lib/dashboard-theme";

export type DashboardCheckStatus = "completed" | "pending" | "missing";

type DashboardCheckRowProps = {
  status: DashboardCheckStatus;
  label: string;
  hint?: string;
  href?: string;
};

export function DashboardCheckRow({ status, label, hint, href }: DashboardCheckRowProps) {
  const icon =
    status === "completed" ? "✓" : status === "pending" ? "○" : "—";
  const iconClass =
    status === "completed"
      ? STATUS_CHECK_COMPLETE_CLASS
      : status === "pending"
        ? STATUS_CHECK_PENDING_CLASS
        : STATUS_CHECK_MISSING_CLASS;
  const textClass =
    status === "completed"
      ? "text-foreground"
      : status === "pending"
        ? STATUS_CHECK_PENDING_TEXT_CLASS
        : "text-muted";

  const labelNode =
    href && status !== "completed" ? (
      <Link href={href} className={`${textClass} ${DASHBOARD_LINK_CLASS}`}>
        {label}
      </Link>
    ) : (
      <span className={textClass}>{label}</span>
    );

  return (
    <li className="flex items-start gap-2 text-foreground/90">
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold ${iconClass}`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0">
        {labelNode}
        {hint ? <span className="mt-0.5 block text-[0.65rem] text-muted">{hint}</span> : null}
      </span>
    </li>
  );
}
