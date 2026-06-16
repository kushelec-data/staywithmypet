"use client";

import { useAuth } from "@/context/AuthContext";
import { STATUS_ALERT_ERROR_COMPACT_CLASS } from "@/lib/status-colors";
import { useLanguage } from "@/context/LanguageContext";
import type { Dictionary } from "@/i18n/translations";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  formatNotificationTime,
  formatNotificationsError,
  groupNotificationsByCategory,
  markAllNotificationsRead,
  markBookingNotificationsRead,
  markNotificationRead,
  markNotificationsReadForConversations,
  markNotificationsReadForRequest,
  notificationActionKind,
  notificationDedupeKey,
  notificationHref,
  NOTIFICATIONS_REFRESH_EVENT,
  subscribeToNotifications,
  type AppNotification,
  type NotificationActionKind,
  type NotificationCategory,
} from "@/lib/notifications";
import { CONVERSATION_READ_EVENT } from "@/lib/messaging";
import { createClient } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Outline bell only (stroke-based) — unified across all states via `currentColor`. */
function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
    </svg>
  );
}

function actionLabel(kind: NotificationActionKind, n: Dictionary["notifications"]): string {
  switch (kind) {
    case "open_message":
      return n.actionOpenMessage;
    case "view_booking":
      return n.actionViewBooking;
    case "leave_review":
      return n.actionLeaveReview;
    case "view_membership":
      return n.actionViewMembership;
    case "view_request":
    default:
      return n.actionViewRequest;
  }
}

function categoryLabel(category: NotificationCategory, n: Dictionary["notifications"]): string {
  switch (category) {
    case "messages":
      return n.groupMessages;
    case "bookings":
      return n.groupBookings;
    case "reviews":
      return n.groupReviews;
    case "membership":
      return n.groupMembership;
    case "requests":
    default:
      return n.groupRequests;
  }
}

type NotificationRowProps = {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
  onAction: (notification: AppNotification) => void;
  actionText: string;
  unreadLabel: string;
};

function NotificationRow({
  notification,
  onOpen,
  onAction,
  actionText,
  unreadLabel,
}: NotificationRowProps) {
  const unread = notification.readAt == null;

  return (
    <li className="border-b border-border last:border-b-0">
      <div
        className={`flex min-w-0 flex-col gap-2 px-3 py-3 sm:px-4 ${
          unread ? "bg-mint/30" : "bg-surface"
        }`}
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => onOpen(notification)}
          className="min-w-0 w-full text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 text-sm font-semibold text-foreground">{notification.title}</span>
            <span className="shrink-0 text-[0.65rem] text-muted">
              {formatNotificationTime(notification.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">{notification.body}</p>
          {unread ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[0.65rem] font-medium text-brand-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
              {unreadLabel}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAction(notification);
          }}
          className="inline-flex max-w-full min-w-0 items-center justify-center self-start rounded-full border border-brand-teal/30 bg-brand-teal/10 px-3 py-1.5 text-[0.6875rem] font-semibold text-brand-teal transition hover:bg-brand-teal/20"
        >
          <span className="truncate">{actionText}</span>
        </button>
      </div>
    </li>
  );
}

export function NotificationsBell() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const userId = user?.id ?? null;
  const hasUnread = unreadCount > 0;
  const isNavActive =
    pathname === "/messages" || (pathname?.startsWith("/messages/") ?? false);
  const isActive = open || isNavActive;

  const grouped = useMemo(() => groupNotificationsByCategory(items), [items]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [list, count] = await Promise.all([
        fetchNotifications(supabase, userId),
        fetchUnreadNotificationCount(supabase, userId),
      ]);
      setItems(list);
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      setError(formatNotificationsError(err));
    }
  }, [supabase, userId]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!userId) return;
    const uid = userId;

    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const [list, count] = await Promise.all([
          fetchNotifications(supabase, uid),
          fetchUnreadNotificationCount(supabase, uid),
        ]);
        if (!cancelled) {
          setItems(list);
          setUnreadCount(count);
        }
      } catch (err) {
        if (!cancelled) setError(formatNotificationsError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void init();
  }, [supabase, userId]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToNotifications(supabase, userId, () => {
      void refreshRef.current();
    });

    const onRefresh = () => {
      void refreshRef.current();
    };
    window.addEventListener(CONVERSATION_READ_EVENT, onRefresh);
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);

    return () => {
      unsubscribe();
      window.removeEventListener(CONVERSATION_READ_EVENT, onRefresh);
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    };
  }, [userId, supabase]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && userId) {
      setLoading(true);
      await refresh();
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    if (!userId || !hasUnread) return;
    try {
      await markAllNotificationsRead(supabase, userId);
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
      setUnreadCount(0);
    } catch (err) {
      setError(formatNotificationsError(err));
    }
  }

  async function openNotification(notification: AppNotification) {
    if (!userId) return;
    setOpen(false);

    if (!notification.readAt) {
      try {
        if (notification.type === "new_message" && notification.relatedConversationId) {
          await markNotificationsReadForConversations(
            supabase,
            [notification.relatedConversationId],
            userId,
          );
        } else if (notification.relatedBookingId) {
          await markBookingNotificationsRead(
            supabase,
            userId,
            notification.relatedBookingId,
            notification.relatedRequestId,
          );
        } else if (notification.relatedRequestId) {
          await markNotificationsReadForRequest(
            supabase,
            userId,
            notification.relatedRequestId,
          );
        } else {
          await markNotificationRead(supabase, notification.id, userId);
        }
        const now = new Date().toISOString();
        const key = notificationDedupeKey(notification);
        setItems((prev) =>
          prev.map((n) =>
            notificationDedupeKey(n) === key ? { ...n, readAt: n.readAt ?? now } : n,
          ),
        );
        const count = await fetchUnreadNotificationCount(supabase, userId);
        setUnreadCount(count);
      } catch {
        /* still navigate */
      }
    }

    router.push(notificationHref(notification));
  }

  if (!userId) return null;

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const n = t.notifications;

  const bellButtonClasses = [
    "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors duration-150",
    isActive
      ? "border-brand-teal/25 bg-mint/40 text-brand-teal shadow-sm"
      : "border-border bg-surface text-muted hover:bg-mint/30 hover:text-foreground/80",
  ].join(" ");

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => void handleToggle()}
        className={bellButtonClasses}
        aria-expanded={open}
        aria-haspopup="true"
        aria-current={isNavActive ? "page" : undefined}
        aria-label={
          hasUnread ? `${n.bellLabel} (${unreadCount} unread)` : n.bellLabel
        }
      >
        <BellIcon />
        {hasUnread ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[0.625rem] font-bold leading-none text-white shadow-sm motion-safe:animate-pulse ring-2 ring-surface"
            aria-hidden
          >
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 flex w-[min(calc(100vw-1.5rem),22rem)] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)] sm:w-[22rem]"
          role="menu"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">{n.title}</h3>
            {hasUnread ? (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="shrink-0 text-xs font-semibold text-brand-teal hover:underline"
              >
                {n.markAllRead}
              </button>
            ) : null}
          </div>

          {error ? (
            <p
              className={`mx-3 my-2 shrink-0 ${STATUS_ALERT_ERROR_COMPACT_CLASS}`}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="min-h-0 max-h-[min(70dvh,28rem)] overflow-y-auto overscroll-contain">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-muted">{n.loading}</p>
            ) : grouped.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">{n.empty}</p>
            ) : (
              grouped.map((group) => (
                <section key={group.category} aria-label={categoryLabel(group.category, n)}>
                  <h4 className="sticky top-0 z-[1] border-b border-border bg-cream/95 px-4 py-2 text-[0.65rem] font-bold uppercase tracking-wide text-muted backdrop-blur-sm">
                    {categoryLabel(group.category, n)}
                  </h4>
                  <ul>
                    {group.items.map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        onOpen={(item) => void openNotification(item)}
                        onAction={(item) => void openNotification(item)}
                        actionText={actionLabel(notificationActionKind(notification), n)}
                        unreadLabel={n.unread}
                      />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
