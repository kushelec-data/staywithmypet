"use client";

import { STATUS_ALERT_ERROR_CLASS } from "@/lib/status-colors";
import { AccountEmptyState } from "@/components/account/AccountEmptyState";
import { AccountLayout } from "@/components/account/AccountLayout";
import { MESSAGES_PANEL_CLASS } from "@/lib/messages-ui";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatPanel } from "@/components/messages/ChatPanel";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  CONVERSATION_READ_EVENT,
  ensureConversationForRequest,
  fetchConversations,
  formatMessagingError,
  conversationSummariesShareThread,
  markConversationFullyRead,
  sortConversationSummaries,
  subscribeToInboxIncomingMessages,
  type ConversationSummary,
} from "@/lib/messaging";
import { markMessageNotificationsRead } from "@/lib/notifications";
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
  const conversationsRef = useRef<ConversationSummary[]>([]);

  selectedIdRef.current = selectedId;
  conversationsRef.current = conversations;

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const loadConversations = useCallback(
    async (preferredId: string | null, options?: { silent?: boolean }) => {
      if (!user) return;

      setLoadError(null);
      if (!options?.silent && !listLoadedRef.current) setListLoading(true);

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

  const refreshConversations = useCallback(
    async (preserveId?: string | null) => {
      await loadConversations(
        preserveId === undefined ? selectedIdRef.current : preserveId,
        { silent: true },
      );
    },
    [loadConversations],
  );

  useEffect(() => {
    if (!user) return;
    void markMessageNotificationsRead(supabase, user.id).catch(() => {
      /* bell will reconcile on next refresh */
    });
  }, [supabase, user?.id]);

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
          const ensured = await ensureConversationForRequest(supabase, requestParam);
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

  useEffect(() => {
    if (!user) return;

    const handleConversationRead = () => {
      void refreshConversations(selectedIdRef.current);
    };

    window.addEventListener(CONVERSATION_READ_EVENT, handleConversationRead);
    return () => {
      window.removeEventListener(CONVERSATION_READ_EVENT, handleConversationRead);
    };
  }, [user?.id, refreshConversations]);

  useEffect(() => {
    if (!user) return;

    let refreshTimer: number | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        void refreshConversations(selectedIdRef.current);
      }, 250);
    };

    const channel = subscribeToInboxIncomingMessages(supabase, user.id, (conversationId) => {
      const activeId = selectedIdRef.current;
      const activeConversation =
        conversationsRef.current.find((c) => c.id === activeId) ?? null;
      if (
        activeConversation &&
        conversationSummariesShareThread(activeConversation, {
          id: conversationId,
          conversationIds: [conversationId],
        })
      ) {
        void markConversationFullyRead(supabase, activeConversation, user.id)
          .then(() => refreshConversations(activeId))
          .catch(() => {
            void refreshConversations(activeId);
          });
        return;
      }

      scheduleRefresh();
    });

    return () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [supabase, user?.id, refreshConversations]);

  const clearUnreadForConversation = useCallback((conv: ConversationSummary) => {
    setConversations((prev) =>
      prev.map((c) =>
        conversationSummariesShareThread(c, conv) ? { ...c, unreadCount: 0 } : c,
      ),
    );
  }, []);

  const selectConversation = useCallback(
    async (id: string) => {
      setSelectedId(id);
      urlSyncedRef.current = id;
      router.replace(`/messages?conversation=${id}`, { scroll: false });

      const conv = conversations.find((c) => c.id === id);
      if (!conv || !user) return;

      clearUnreadForConversation(conv);

      try {
        await markConversationFullyRead(supabase, conv, user.id);
      } catch {
        /* refresh reconciles with database */
      } finally {
        await refreshConversations(id);
      }
    },
    [clearUnreadForConversation, conversations, refreshConversations, router, supabase, user],
  );

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
          className={`${MESSAGES_PANEL_CLASS} w-full min-w-0 shrink-0 lg:w-[340px] ${
            showMobileChat ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="shrink-0 border-b border-[#E4DED2] bg-[#F6F2EA] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#2B2B2B]">{t.messages.conversations}</h2>
          </div>

          {loadError ? (
            <p
              className={`mx-3 my-2 ${STATUS_ALERT_ERROR_CLASS}`}
              role="alert"
            >
              {loadError}
            </p>
          ) : null}

          {listLoading ? (
            <p className={`px-4 py-10 text-sm text-[#8A8276]`}>{t.messages.loading}</p>
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
          className={`${MESSAGES_PANEL_CLASS} min-h-0 w-full min-w-0 flex-1 ${
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
              onInboxRefresh={() => refreshConversations(selectedConversation.id)}
            />
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center px-6 py-8 text-center lg:flex">
              <p className="text-2xl" aria-hidden>
                💬
              </p>
              <p className="mt-2 text-xs text-[#8A8276]">{t.messages.selectConversation}</p>
            </div>
          )}
        </section>
      </div>
    </AccountLayout>
  );
}
