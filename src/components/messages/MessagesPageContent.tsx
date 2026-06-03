"use client";

import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { AccountLayout } from "@/components/account/AccountLayout";
import { ACCOUNT_MESSAGES_PANEL_CLASS } from "@/lib/account-ui";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatPanel } from "@/components/messages/ChatPanel";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  ensureConversationForAcceptedRequest,
  fetchConversations,
  formatMessagingError,
  markConversationFullyRead,
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

  const clearUnreadForConversation = useCallback((conv: ConversationSummary) => {
    const ids = new Set(conv.conversationIds?.length ? conv.conversationIds : [conv.id]);
    setConversations((prev) =>
      prev.map((c) => (ids.has(c.id) ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  function selectConversation(id: string) {
    setSelectedId(id);
    urlSyncedRef.current = id;
    router.replace(`/messages?conversation=${id}`, { scroll: false });

    setConversations((prev) => {
      const conv = prev.find((c) => c.id === id);
      if (conv) {
        const ids = new Set(conv.conversationIds?.length ? conv.conversationIds : [conv.id]);
        if (user) {
          void markConversationFullyRead(supabase, conv, user.id).catch(() => {
            /* optimistic UI already cleared; refetch will reconcile */
          });
        }
        return prev.map((c) => (ids.has(c.id) ? { ...c, unreadCount: 0 } : c));
      }
      return prev;
    });
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
    <AccountLayout
      title={t.messages.pageTitle}
      description={t.messages.pageDescription}
      hideCompleteProfileBanner
    >
      <div className="flex h-[min(78dvh,720px)] min-h-[min(320px,65dvh)] w-full max-w-full min-w-0 flex-col gap-3 overflow-hidden sm:min-h-[420px] lg:flex-row lg:gap-4">
        <aside
          className={`${ACCOUNT_MESSAGES_PANEL_CLASS} w-full shrink-0 lg:w-[340px] ${
            showMobileChat ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="shrink-0 border-b border-[#E5E2D8] px-4 py-3">
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
            <AccountEmptyState
              className="flex-1 justify-center py-10"
              icon="💬"
              title={t.messages.emptyTitle}
              description={t.messages.emptyDescription}
              actions={[
                { href: "/dashboard/requests?direction=incoming", label: t.messages.viewRequests },
                { href: "/find-care", label: t.messages.findFriends, variant: "outline" },
              ]}
            />
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
          className={`${ACCOUNT_MESSAGES_PANEL_CLASS} min-h-0 min-w-0 flex-1 ${
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
              onConversationRead={() => clearUnreadForConversation(selectedConversation)}
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
    </AccountLayout>
  );
}
