import Link from "next/link";
import type React from "react";

/** Matches sidebar panels (`DashboardInfoCard` titleStyle="panel"). */
export const DASHBOARD_PANEL_SECTION_LABEL =
  "text-[0.65rem] font-semibold uppercase tracking-wider text-muted";

type DashboardInfoCardProps = {
  title: string;
  editHref?: string;
  editLabel?: string;
  children: React.ReactNode;
  className?: string;
  titleStyle?: "card" | "panel";
};

export function DashboardInfoCard({
  title,
  editHref,
  editLabel = "Edit",
  children,
  className = "",
  titleStyle = "card",
}: DashboardInfoCardProps) {
  const isPanel = titleStyle === "panel";

  return (
    <section className={`swmp-warm-card rounded-2xl p-4 sm:p-5 ${className}`}>
      <header
        className={`flex flex-wrap items-start justify-between gap-2 ${isPanel ? "items-center" : ""}`}
      >
        {isPanel ? (
          <p className={DASHBOARD_PANEL_SECTION_LABEL}>{title}</p>
        ) : (
          <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
        )}
        {editHref ? (
          <Link
            href={editHref}
            className={`shrink-0 font-semibold text-brand-teal transition-colors hover:text-brand-pink ${
              isPanel ? "text-xs" : "text-sm"
            }`}
          >
            {editLabel}
          </Link>
        ) : null}
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function DashboardTagList({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full bg-mint/50 px-3 py-1 text-xs font-medium text-brand-teal"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

export function DashboardEmptyState({
  message,
  actionHref,
  actionLabel,
}: {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <p className="text-sm text-muted">
      {message}
      {actionHref && actionLabel ? (
        <>
          {" "}
          <Link href={actionHref} className="font-semibold text-brand-teal hover:text-brand-pink">
            {actionLabel}
          </Link>
        </>
      ) : null}
    </p>
  );
}

export function DashboardDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(8.5rem,36%)_minmax(0,1fr)] sm:items-start sm:gap-x-4">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0 text-sm leading-snug break-words text-foreground">{value}</dd>
    </div>
  );
}
