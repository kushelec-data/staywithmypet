"use client";

import { BookingReviewBanner } from "@/components/messages/BookingReviewBanner";
import { STATUS_ALERT_ERROR_COMPACT_CLASS, STATUS_ALERT_WARNING_COMPACT_CLASS } from "@/lib/status-colors";
import { MessageThread } from "@/components/messages/MessageThread";
import { ReportUserModal } from "@/components/trust/ReportUserModal";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { useLanguage } from "@/context/LanguageContext";
import { bookingDetailsHref } from "@/lib/bookings";
import {
  MESSAGES_CHAT_ROOT_CLASS,
  MESSAGES_HEADER_CLASS,
  MESSAGES_INPUT_BAR_CLASS,
  MESSAGES_META_TEXT_CLASS,
  MESSAGES_META_TEXT_MUTED_CLASS,
  MESSAGES_AVATAR_RING_CLASS,
  MESSAGES_SOFT_HOVER_CLASS,
  MESSAGES_TEXTAREA_CLASS,
  MESSAGES_THREAD_SCROLL_CLASS,
} from "@/lib/messages-ui";
import {
  canSendInConversation,
  fetchMessages,
  formatCancelledBookingChatGraceEnd,
  formatConversationDateLabel,
  formatMessagingError,
  getConversationBookingDisplayStatus,
  isCancelledBookingChatGraceActive,
  isCancelledBookingChatGraceExpired,
  markConversationFullyRead,
  resolveConversationStatusDisplay,
  sendMessage,
  subscribeToConversationMessages,
  type ChatMessage,
  type ConversationSummary,
} from "@/lib/messaging";
import { blockUser, formatTrustSafetyError, isUserBlocked } from "@/lib/trust-safety";
import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MembershipUpsellToast } from "@/components/membership/MembershipUpsellToast";
import { useProfile } from "@/context/ProfileContext";
import { activeModeToMembershipRole } from "@/lib/membership";
import {
  conversationExemptFromMembershipUpsell,
  shouldShowMembershipUpsellAfterMessageSend,
} from "@/lib/membership-upsell";
import { resolveActiveMode } from "@/lib/profile-mode";

type ChatPanelProps = {
  conversation: ConversationSummary;
  userId: string;
  supabase: SupabaseClient;
  onBack: () => void;
  onMessageSent: (preview: string, createdAt: string) => void;
  onConversationRead?: () => void;
};

const QUICK_EMOJIS = ["😊", "👍", "🐾", "❤️", "🙏"];

export function ChatPanel({
  conversation,
  userId,
  supabase,
  onBack,
  onMessageSent,
  onConversationRead,
}: ChatPanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const membershipReturnTo = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);
  const { t, locale } = useLanguage();
  const { profile } = useProfile();
  const m = t.messages;
  const ts = t.trustSafety;
  const conversationId = conversation.id;
  const conversationDateLabel = formatConversationDateLabel(conversation, locale);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prefersSmoothScrollRef = useRef(false);

  const canSend = canSendInConversation(conversation) && !blocked;
  const cancelledBookingGraceActive = isCancelledBookingChatGraceActive(conversation);
  const cancelledBookingGraceExpired = isCancelledBookingChatGraceExpired(conversation);
  const cancelledGraceEndLabel = formatCancelledBookingChatGraceEnd(
    conversation.bookingCancelledAt,
  );
  const bookingDisplayStatus = getConversationBookingDisplayStatus(conversation);
  const showReviewBanner =
    conversation.requestStatus === "completed" ||
    conversation.bookingStatus === "completed" ||
    bookingDisplayStatus === "completed";

  const thumbUrl = conversation.petPhotoUrl ?? conversation.otherPartyAvatarUrl;
  const displayName = conversation.petName ?? conversation.threadTitle;
  const thumbInitial = displayName.trim().charAt(0).toUpperCase() || "?";
  const statusDisplay = resolveConversationStatusDisplay(conversation, t.requests, {
    statusUpcoming: t.bookings.statusUpcoming,
    statusActive: t.bookings.statusActive,
    statusCompleted: t.bookings.statusCompleted,
    statusCancelled: t.bookings.statusCancelled,
  });

  const scrollThreadToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    prefersSmoothScrollRef.current = false;
    setUpgradeOpen(false);
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setMessages([]);
      setDraft("");
      setEmojiOpen(false);
      prefersSmoothScrollRef.current = false;

      try {
        const [rows, isBlocked] = await Promise.all([
          fetchMessages(supabase, conversationId, userId),
          isUserBlocked(supabase, userId, conversation.otherPartyId),
        ]);
        if (cancelled) return;
        setMessages(rows);
        setBlocked(isBlocked);
        await markConversationFullyRead(supabase, conversation, userId);
        onConversationRead?.();
      } catch (err) {
        if (!cancelled) {
          setMessages([]);
          setError(formatMessagingError(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [conversationId, supabase, userId, conversation.otherPartyId]);

  useEffect(() => {
    const channel = subscribeToConversationMessages(supabase, conversationId, userId, (message) => {
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev;
        return [...prev, message];
      });
      if (!message.isOwn) {
        void markConversationFullyRead(supabase, conversation, userId).then(() => {
          onConversationRead?.();
        });
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversation, conversationId, supabase, userId, onConversationRead]);

  useEffect(() => {
    if (loading) return;
    const behavior = prefersSmoothScrollRef.current ? "smooth" : "auto";
    scrollThreadToBottom(behavior);
    prefersSmoothScrollRef.current = true;
  }, [messages.length, loading, conversationId, scrollThreadToBottom]);

  async function handleBlock() {
    const confirmed = window.confirm(
      ts.blockConfirm.replace("{name}", conversation.otherPartyName),
    );
    if (!confirmed) return;
    try {
      await blockUser(supabase, userId, conversation.otherPartyId);
      setBlocked(true);
    } catch (err) {
      setError(formatTrustSafetyError(err));
    }
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || sending || !canSend) return;

    setSending(true);
    setError(null);
    try {
      const msg = await sendMessage(
        supabase,
        conversationId,
        userId,
        text,
        conversation.otherPartyId,
      );
      setMessages((prev) => {
        if (prev.some((item) => item.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setDraft("");
      setEmojiOpen(false);
      onMessageSent(msg.body, msg.createdAt);
      void import("@/app/actions/email-events").then(({ sendNewMessageEmailAction }) =>
        sendNewMessageEmailAction({
          conversationId,
          messageId: msg.id,
          recipientUserId: conversation.otherPartyId,
        }),
      );
    } catch (err) {
      if (shouldShowMembershipUpsellAfterMessageSend(conversation, err)) {
        setUpgradeOpen(true);
        setError(null);
      } else {
        setError(formatMessagingError(err));
      }
    } finally {
      setSending(false);
    }
  }

  function insertEmoji(emoji: string) {
    setDraft((prev) => prev + emoji);
  }

  const inputPlaceholder = blocked
    ? m.inputBlocked
    : cancelledBookingGraceExpired
      ? m.inputCancelledGraceEnded
      : !canSendInConversation(conversation)
        ? m.inputClosed
        : m.typeMessage;

  return (
    <div className={MESSAGES_CHAT_ROOT_CLASS}>
      <header className={MESSAGES_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-teal hover:bg-[#DDEEDF] lg:hidden"
            aria-label={m.backToList}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt=""
              className={`h-9 w-9 shrink-0 rounded-full object-cover ${MESSAGES_AVATAR_RING_CLASS}`}
            />
          ) : (
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DDEEDF] text-xs font-semibold text-brand-teal ${MESSAGES_AVATAR_RING_CLASS}`}
            >
              {thumbInitial}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1">
              <h2 className="min-w-0 truncate text-sm font-semibold text-[#2B2B2B]">{displayName}</h2>
              <span
                className={`${statusDisplay.badgeClasses} w-fit max-w-full shrink-0 !px-1.5 !py-0 !text-[0.5625rem]`}
              >
                {statusDisplay.label}
              </span>
            </div>
            <p className={`min-w-0 text-[0.6875rem] leading-snug ${MESSAGES_META_TEXT_CLASS}`}>
              <span className="font-medium">{conversation.otherPartyName}</span>
              {conversationDateLabel ? (
                <span className={`break-words ${MESSAGES_META_TEXT_MUTED_CLASS}`}>
                  {" "}
                  · {conversationDateLabel}
                </span>
              ) : null}
              {conversation.careType ? (
                <span className={`break-words ${MESSAGES_META_TEXT_MUTED_CLASS}`}>
                  {" "}
                  · {conversation.careType}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {conversation.bookingId ? (
              <Link
                href={bookingDetailsHref(conversation.bookingId)}
                className="inline-flex items-center rounded-full px-2 py-1 text-[0.6875rem] font-medium text-brand-teal hover:bg-[#DDEEDF]"
              >
                {m.viewBooking}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className={`inline-flex items-center rounded-full px-2 py-1 text-[0.6875rem] font-medium ${MESSAGES_META_TEXT_CLASS} ${MESSAGES_SOFT_HOVER_CLASS}`}
            >
              {ts.reportUser}
            </button>
            {!blocked ? (
              <button
                type="button"
                onClick={() => void handleBlock()}
                className={`inline-flex items-center rounded-full px-2 py-1 text-[0.6875rem] font-medium ${MESSAGES_META_TEXT_CLASS} ${MESSAGES_SOFT_HOVER_CLASS}`}
              >
                {ts.blockUser}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {cancelledBookingGraceActive && cancelledGraceEndLabel ? (
        <p
          className={`shrink-0 ${STATUS_ALERT_WARNING_COMPACT_CLASS}`}
          role="status"
        >
          {m.cancelledBookingChatGraceBanner.replace("{date}", cancelledGraceEndLabel)}
        </p>
      ) : null}
      {cancelledBookingGraceExpired ? (
        <p
          className={`shrink-0 border-b border-[#E4DED2] bg-[#F3EFE6] px-4 py-2.5 text-xs leading-relaxed ${MESSAGES_META_TEXT_MUTED_CLASS}`}
          role="status"
        >
          {m.cancelledBookingChatEndedBanner}
        </p>
      ) : null}

      {showReviewBanner && conversation.bookingId ? (
        <BookingReviewBanner bookingId={conversation.bookingId} petName={conversation.petName} />
      ) : null}

      <div ref={scrollContainerRef} className={MESSAGES_THREAD_SCROLL_CLASS}>
        <MessageThread
          messages={messages}
          loading={loading}
          emptyTitle={m.threadEmptyTitle}
          emptyHint={m.threadEmptyHint}
          incomingAvatarUrl={conversation.otherPartyAvatarUrl}
          incomingInitial={
            conversation.otherPartyName.trim().charAt(0).toUpperCase() || "?"
          }
        />
      </div>

      {error ? (
        <p
          className={`mx-3 mb-1 shrink-0 ${STATUS_ALERT_ERROR_COMPACT_CLASS}`}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSend} className={MESSAGES_INPUT_BAR_CLASS}>
        {emojiOpen ? (
          <div className="mb-1.5 flex gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className={`rounded-full px-2 py-0.5 text-base ${MESSAGES_SOFT_HOVER_CLASS}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEmojiOpen((v) => !v)}
            disabled={!canSend}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base ${MESSAGES_META_TEXT_MUTED_CLASS} ${MESSAGES_SOFT_HOVER_CLASS} disabled:opacity-40`}
            aria-label={t.messagesUi.insertEmoji}
          >
            😊
          </button>
          <label htmlFor={`message_body_${conversationId}`} className="sr-only">
            {m.typeMessage}
          </label>
          <AutoResizeTextarea
            id={`message_body_${conversationId}`}
            minRows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={inputPlaceholder}
            disabled={sending || !canSend}
            className={MESSAGES_TEXTAREA_CLASS}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <button
            type="submit"
            disabled={sending || !canSend || !draft.trim()}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-brand-teal px-4 text-xs font-semibold text-white hover:bg-brand-teal-hover disabled:opacity-50"
          >
            {sending ? m.sending : m.send}
          </button>
        </div>
      </form>

      <ReportUserModal
        open={reportOpen}
        reportedUserId={conversation.otherPartyId}
        reportedUserName={conversation.otherPartyName}
        reporterId={userId}
        onClose={() => setReportOpen(false)}
      />

      <MembershipUpsellToast
        open={upgradeOpen && !conversationExemptFromMembershipUpsell(conversation)}
        variant="fallback"
        role={
          profile
            ? activeModeToMembershipRole(
                resolveActiveMode(profile.role, profile.active_mode),
              )
            : "pet_parent"
        }
        returnTo={membershipReturnTo}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
}
