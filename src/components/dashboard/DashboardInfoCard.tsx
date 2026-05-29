import Link from "next/link";
import type React from "react";
import {
  ACCOUNT_BODY_TEXT,
  ACCOUNT_BODY_VALUE,
  ACCOUNT_FIELD_LABEL_CLASS,
  ACCOUNT_SECTION_TITLE,
  DASHBOARD_CARD_CLASS,
  DASHBOARD_LINK_CLASS,
  DASHBOARD_TAG_CLASS,
} from "@/lib/dashboard-theme";

/** Matches Edit Profile / account section labels. */
export const DASHBOARD_PANEL_SECTION_LABEL = ACCOUNT_FIELD_LABEL_CLASS;

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
    <section className={`${DASHBOARD_CARD_CLASS} p-4 sm:p-5 ${className}`}>
      <header
        className={`flex flex-wrap items-start justify-between gap-2 ${isPanel ? "items-center" : ""}`}
      >
        {isPanel ? (
          <p className={DASHBOARD_PANEL_SECTION_LABEL}>{title}</p>
        ) : (
          <h2 className={ACCOUNT_SECTION_TITLE}>{title}</h2>
        )}
        {editHref ? (
          <Link
            href={editHref}
            className={`${DASHBOARD_LINK_CLASS} shrink-0 ${isPanel ? "text-xs" : "text-sm"}`}
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
          className={`${DASHBOARD_TAG_CLASS} px-3 py-1 text-xs`}
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
    <p className={ACCOUNT_BODY_TEXT}>
      {message}
      {actionHref && actionLabel ? (
        <>
          {" "}
          <Link href={actionHref} className={DASHBOARD_LINK_CLASS}>
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
      <dt className={`${ACCOUNT_FIELD_LABEL_CLASS} sm:pt-0.5`}>
        {label}
      </dt>
      <dd className={`min-w-0 leading-snug break-words ${ACCOUNT_BODY_VALUE}`}>{value}</dd>
    </div>
  );
}
