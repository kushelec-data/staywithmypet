"use client";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  formatNotificationTime,
  formatNotificationsError,
  isReviewRequestNotification,
  markAllNotificationsRead,
  markNotificationRead,
  notificationHref,
  subscribeToNotifications,
  type AppNotification,
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
  /** Soft green “active” when panel is open or user is on a notification-centric route. */
  const isNavActive =
    pathname === "/messages" || (pathname?.startsWith("/messages/") ?? false);
  const isActive = open || isNavActive;

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

    const onConversationRead = () => {
      void refreshRef.current();
    };
    window.addEventListener(CONVERSATION_READ_EVENT, onConversationRead);

    return () => {
      unsubscribe();
      window.removeEventListener(CONVERSATION_READ_EVENT, onConversationRead);
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

  async function handleSelect(notification: AppNotification) {
    if (!userId) return;
    setOpen(false);

    if (!notification.readAt) {
      try {
        await markNotificationRead(supabase, notification.id, userId);
        setItems((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        /* still navigate */
      }
    }

    router.push(notificationHref(notification));
  }

  if (!userId) return null;

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

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
          hasUnread
            ? `${t.notifications.bellLabel} (${unreadCount} unread)`
            : t.notifications.bellLabel
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
          className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
          role="menu"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">{t.notifications.title}</h3>
            {hasUnread ? (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs font-semibold text-brand-teal hover:underline"
              >
                {t.notifications.markAllRead}
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="mx-3 my-2 rounded-lg bg-brand-pink-muted/50 px-3 py-2 text-xs text-brand-pink" role="alert">
              {error}
            </p>
          ) : null}

          <ul className="max-h-[min(60vh,320px)] overflow-y-auto">
            {loading ? (
              <li className="px-4 py-6 text-center text-sm text-muted">{t.notifications.loading}</li>
            ) : items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted">{t.notifications.empty}</li>
            ) : (
              items.map((notification) => {
                const unread = notification.readAt == null;
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleSelect(notification)}
                      className={`flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition last:border-b-0 ${
                        unread ? "bg-mint/30 hover:bg-mint/50" : "hover:bg-cream/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">{notification.title}</span>
                        <span className="shrink-0 text-[0.65rem] text-muted">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted">{notification.body}</p>
                      {isReviewRequestNotification(notification) ? (
                        <span className="mt-1.5 inline-flex rounded-full bg-brand-teal/10 px-2 py-0.5 text-[0.65rem] font-semibold text-brand-teal">
                          {t.notifications.leaveReview} →
                        </span>
                      ) : null}
                      {unread ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-[0.65rem] font-medium text-brand-teal">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
                          {t.notifications.unread}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
