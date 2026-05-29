"use client";

import Link from "next/link";
import { DASHBOARD_LINK_CLASS, DASHBOARD_STATUS_COMPLETE_CLASS } from "@/lib/dashboard-theme";

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
      ? DASHBOARD_STATUS_COMPLETE_CLASS
      : status === "pending"
        ? "border border-amber-400/60 bg-amber-50 text-amber-700"
        : "border border-[#E5E2D8] bg-[#F8F6F1] text-muted";
  const textClass =
    status === "completed"
      ? "text-foreground"
      : status === "pending"
        ? "text-amber-800"
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
