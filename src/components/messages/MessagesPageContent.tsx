"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatPanel } from "@/components/messages/ChatPanel";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  ensureConversationForAcceptedRequest,
  fetchConversations,
  formatMessagingError,
  sortConversationSummaries,
  type ConversationSummary,
} from "@/lib/messaging";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function pickConversationId(
  rows: ConversationSummary[],
  preferredId: string | null,
  currentId: string | null,
): string | null {
  if (preferredId && rows.some((r) => r.id === preferredId)) return preferredId;
  if (currentId && rows.some((r) => r.id === currentId)) return currentId;
  return rows[0]?.id ?? null;
}

export function MessagesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedIdRef = useRef<string | null>(null);
  const listLoadedRef = useRef(false);
  const urlSyncedRef = useRef<string | null>(null);

  selectedIdRef.current = selectedId;

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const loadConversations = useCallback(
    async (preferredId: string | null) => {
      if (!user) return;

      setLoadError(null);
      if (!listLoadedRef.current) setListLoading(true);

      try {
        const rows = await fetchConversations(supabase, user.id);
        listLoadedRef.current = true;
        setConversations(rows);

        const nextId = pickConversationId(rows, preferredId, selectedIdRef.current);
        setSelectedId(nextId);

        if (nextId && urlSyncedRef.current !== nextId) {
          const currentParam = new URLSearchParams(window.location.search).get("conversation");
          if (currentParam !== nextId) {
            urlSyncedRef.current = nextId;
            router.replace(`/messages?conversation=${nextId}`, { scroll: false });
          } else {
            urlSyncedRef.current = nextId;
          }
        }
      } catch (err) {
        setLoadError(formatMessagingError(err));
      } finally {
        setListLoading(false);
      }
    },
    [supabase, user?.id, router],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/messages");
      return;
    }

    let cancelled = false;

    async function init() {
      const requestParam = searchParams.get("request");
      let preferredId = searchParams.get("conversation");

      if (requestParam && !preferredId) {
        try {
          const ensured = await ensureConversationForAcceptedRequest(supabase, requestParam);
          if (ensured) preferredId = ensured;
        } catch {
          /* errors surface when loading the list */
        }
      }

      if (cancelled) return;
      await loadConversations(preferredId);
    }

    void init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  function selectConversation(id: string) {
    setSelectedId(id);
    urlSyncedRef.current = id;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
    );
    router.replace(`/messages?conversation=${id}`, { scroll: false });
  }

  function handleBackToList() {
    setSelectedId(null);
    urlSyncedRef.current = null;
    router.replace("/messages", { scroll: false });
  }

  function handleMessageSent(preview: string, createdAt: string) {
    const activeId = selectedIdRef.current;
    if (!activeId) return;
    setConversations((prev) => {
      const next = prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              lastMessagePreview: preview,
              lastMessageAt: createdAt,
              sortAt: createdAt,
              unreadCount: 0,
            }
          : c,
      );
      next.sort((a, b) => (a.sortAt < b.sortAt ? 1 : a.sortAt > b.sortAt ? -1 : 0));
      return sortConversationSummaries(next);
    });
  }

  const showMobileChat = Boolean(selectedId && selectedConversation);

  return (
    <DashboardShell
      title={t.messages.pageTitle}
      description={t.messages.pageDescription}
      hideCompleteProfileBanner
    >
      <div className="flex h-[min(78dvh,720px)] min-h-[min(320px,65dvh)] w-full max-w-full min-w-0 flex-col gap-3 bg-[#f8f5ef] sm:min-h-[420px] lg:flex-row lg:gap-4 dark:bg-[#1c1b19]">
        <aside
          className={`flex w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-[#f5f1e8] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-[#2a2824] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)] lg:w-[340px] ${
            showMobileChat ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="shrink-0 border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
            <h2 className="text-sm font-semibold text-foreground">{t.messages.conversations}</h2>
          </div>

          {loadError ? (
            <p
              className="mx-3 my-2 rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink"
              role="alert"
            >
              {loadError}
            </p>
          ) : null}

          {listLoading ? (
            <p className="px-4 py-10 text-sm text-muted">{t.messages.loading}</p>
          ) : conversations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <p className="text-3xl" aria-hidden>
                💬
              </p>
              <h3 className="mt-3 font-heading text-lg font-bold text-foreground">
                {t.messages.emptyTitle}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
                {t.messages.emptyDescription}
              </p>
              <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
                <Link
                  href="/dashboard/requests?direction=incoming"
                  className="rounded-full bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-teal/20 hover:bg-brand-teal-hover"
                >
                  {t.messages.viewRequests}
                </Link>
                <Link
                  href="/find-care"
                  className="rounded-full border border-brand-teal/30 px-4 py-2.5 text-sm font-semibold text-brand-teal hover:bg-mint/40"
                >
                  {t.messages.findFriends}
                </Link>
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ConversationList
                conversations={conversations}
                selectedId={selectedId}
                onSelect={selectConversation}
              />
            </div>
          )}
        </aside>

        <section
          className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-[#fffaf2] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-[#252320] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)] ${
            showMobileChat ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedConversation && user ? (
            <ChatPanel
              key={selectedConversation.id}
              conversation={selectedConversation}
              userId={user.id}
              supabase={supabase}
              onBack={handleBackToList}
              onMessageSent={handleMessageSent}
            />
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center px-6 py-8 text-center lg:flex">
              <p className="text-2xl" aria-hidden>
                💬
              </p>
              <p className="mt-2 text-xs text-muted">{t.messages.selectConversation}</p>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
