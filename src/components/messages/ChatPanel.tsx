"use client";

import { BookingReviewBanner } from "@/components/messages/BookingReviewBanner";
import { ChatMediaAttachButton } from "@/components/messages/ChatMediaAttachButton";
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
  sendMessagePrecheckFromConversation,
  subscribeToConversationMessages,
  type ChatMessage,
  type ConversationSummary,
} from "@/lib/messaging";
import {
  buildChatMediaStoragePath,
  chatMessagePreviewText,
  ChatMediaUploadError,
  ChatMediaValidationError,
  ChatMessageSaveError,
  uploadChatMediaFile,
  validateChatMediaFile,
} from "@/lib/chat-media";
import { blockUser, fetchBlockedUserIds, formatTrustSafetyError, isUserBlocked, unblockUser } from "@/lib/trust-safety";
import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MembershipUpsellToast } from "@/components/membership/MembershipUpsellToast";
import { useProfile } from "@/context/ProfileContext";
import { activeModeToMembershipRole, emptyMembershipsByRole } from "@/lib/membership";
import {
  conversationExemptFromMembershipUpsell,
  shouldShowMembershipUpsellAfterMessageSend,
} from "@/lib/membership-upsell";
import { isWelcomeOfferEligibleForRole } from "@/lib/profile-utils";
import {
  isMembershipUpsellDismissedForSession,
} from "@/lib/new-member-promotion";
import { resolveActiveMode } from "@/lib/profile-mode";

type ChatPanelProps = {
  conversation: ConversationSummary;
  userId: string;
  supabase: SupabaseClient;
  onBack: () => void;
  onMessageSent: (preview: string, createdAt: string) => void;
  onConversationRead?: () => void;
  onInboxRefresh?: () => void | Promise<void>;
};

const QUICK_EMOJIS = ["😊", "👍", "🐾", "❤️", "🙏"];

const SUCCESS_TOAST_MS = 4000;

export function ChatPanel({
  conversation,
  userId,
  supabase,
  onBack,
  onMessageSent,
  onConversationRead,
  onInboxRefresh,
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
  const ui = t.messagesUi;
  const ts = t.trustSafety;
  const conversationId = conversation.id;
  const conversationDateLabel = formatConversationDateLabel(conversation, locale);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [toastMounted, setToastMounted] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const prefersSmoothScrollRef = useRef(false);
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;

  const persistConversationRead = useCallback(async () => {
    await markConversationFullyRead(supabase, conversationRef.current, userId);
    onConversationRead?.();
    await onInboxRefresh?.();
  }, [onConversationRead, onInboxRefresh, supabase, userId]);

  const canSend = canSendInConversation(conversation) && !blocked;
  const uploading = uploadProgress !== null;
  const cancelledBookingGraceActive = isCancelledBookingChatGraceActive(conversation);
  const membershipRole = profile
    ? activeModeToMembershipRole(resolveActiveMode(profile.role, profile.active_mode))
    : "pet_parent";
  const promotionEligible = isWelcomeOfferEligibleForRole(profile, membershipRole);

  const openMembershipUpsellIfAllowed = useCallback(() => {
    if (isMembershipUpsellDismissedForSession()) return;
    setUpgradeOpen(true);
  }, []);
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
  const messagePrecheck = useMemo(
    () => sendMessagePrecheckFromConversation(conversation),
    [
      conversation.requestId,
      conversation.requestStatus,
      conversation.bookingStatus,
      conversation.bookingCancelledAt,
    ],
  );
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

  const focusMessageInput = useCallback(() => {
    requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    setToastMounted(true);
  }, []);

  useEffect(() => {
    if (!successToast) return;
    const timer = window.setTimeout(() => setSuccessToast(null), SUCCESS_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [successToast]);

  useEffect(() => {
    prefersSmoothScrollRef.current = false;
    setUpgradeOpen(false);
    setSuccessToast(null);
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setMessages([]);
      setDraft("");
      setEmojiOpen(false);
      setUploadProgress(null);
      prefersSmoothScrollRef.current = false;

      try {
        const [rows, isBlockedEitherWay, blockedIds] = await Promise.all([
          fetchMessages(supabase, conversationId, userId),
          isUserBlocked(supabase, userId, conversation.otherPartyId),
          fetchBlockedUserIds(supabase, userId),
        ]);
        if (cancelled) return;
        setMessages(rows);
        setBlocked(isBlockedEitherWay);
        setBlockedByMe(blockedIds.has(conversation.otherPartyId));
        await persistConversationRead();
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
  }, [conversationId, supabase, userId, conversation.otherPartyId, persistConversationRead]);

  useEffect(() => {
    const channel = subscribeToConversationMessages(supabase, conversationId, userId, (message) => {
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev;
        return [...prev, message];
      });
      if (!message.isOwn) {
        void persistConversationRead();
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, supabase, userId, persistConversationRead]);

  useEffect(() => {
    if (loading) return;
    const behavior = prefersSmoothScrollRef.current ? "smooth" : "auto";
    scrollThreadToBottom(behavior);
    prefersSmoothScrollRef.current = true;
  }, [messages.length, loading, conversationId, scrollThreadToBottom]);

  async function handleBlockToggle() {
    if (blockedByMe) {
      try {
        setError(null);
        await unblockUser(supabase, userId, conversation.otherPartyId);
        setBlockedByMe(false);
        const stillBlocked = await isUserBlocked(supabase, userId, conversation.otherPartyId);
        setBlocked(stillBlocked);
        setSuccessToast(ts.unblockSuccess);
      } catch (err) {
        setError(formatTrustSafetyError(err));
      }
      return;
    }

    const confirmed = window.confirm(
      ts.blockConfirm.replace("{name}", conversation.otherPartyName),
    );
    if (!confirmed) return;
    try {
      setError(null);
      await blockUser(supabase, userId, conversation.otherPartyId);
      setBlockedByMe(true);
      setBlocked(true);
    } catch (err) {
      setError(formatTrustSafetyError(err));
    }
  }

  function messagePreview(msg: ChatMessage): string {
    return chatMessagePreviewText({
      body: msg.body,
      mediaType: msg.mediaType,
      photoLabel: ui.mediaPreviewPhoto,
      videoLabel: ui.mediaPreviewVideo,
    });
  }

  async function deliverMessage(msg: ChatMessage) {
    setMessages((prev) => {
      if (prev.some((item) => item.id === msg.id)) return prev;
      return [...prev, msg];
    });
    setDraft("");
    setEmojiOpen(false);
    onMessageSent(messagePreview(msg), msg.createdAt);
    void (async () => {
      try {
        const { sendNewMessageEmailAction } = await import("@/app/actions/email-events");
        await sendNewMessageEmailAction({
          conversationId,
          messageId: msg.id,
          recipientUserId: conversation.otherPartyId,
        });
      } catch {
        /* email is best-effort; in-app notification still created by DB trigger */
      }
    })();
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || sending || uploading || !canSend) return;

    setSending(true);
    setError(null);
    let sent = false;
    try {
      const msg = await sendMessage(
        supabase,
        conversationId,
        userId,
        text,
        conversation.otherPartyId,
        undefined,
        messagePrecheck,
      );
      await deliverMessage(msg);
      sent = true;
    } catch (err) {
      if (shouldShowMembershipUpsellAfterMessageSend(conversation, err)) {
        openMembershipUpsellIfAllowed();
        setError(null);
      } else {
        setError(formatMessagingError(err));
      }
    } finally {
      setSending(false);
      if (sent) {
        focusMessageInput();
      }
    }
  }

  async function handleMediaSelected(file: File) {
    if (sending || uploading || !canSend) return;

    setError(null);
    setUploadProgress(0);

    try {
      const mediaType = validateChatMediaFile(file);
      const storagePath = buildChatMediaStoragePath(conversationId, userId, file);

      await uploadChatMediaFile(supabase, storagePath, file, setUploadProgress);

      const msg = await sendMessage(
        supabase,
        conversationId,
        userId,
        draft.trim(),
        conversation.otherPartyId,
        {
          storagePath,
          mediaType,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        },
        messagePrecheck,
      );
      await deliverMessage(msg);
      focusMessageInput();
    } catch (err) {
      if (shouldShowMembershipUpsellAfterMessageSend(conversation, err)) {
        openMembershipUpsellIfAllowed();
        setError(null);
      } else if (err instanceof ChatMediaValidationError) {
        setError(
          err.code === "file_too_large"
            ? ui.fileTooLarge
            : err.code === "unsupported_type"
              ? ui.unsupportedFileType
              : ui.mediaUploadFailed,
        );
      } else if (err instanceof ChatMediaUploadError) {
        setError(ui.mediaUploadFailed);
      } else if (err instanceof ChatMessageSaveError) {
        setError(ui.messageSaveFailed);
      } else {
        setError(formatMessagingError(err));
      }
    } finally {
      setUploadProgress(null);
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

  const bookingMeta = (
    <>
      <span className="font-medium">{conversation.otherPartyName}</span>
      {conversationDateLabel ? (
        <span className={MESSAGES_META_TEXT_MUTED_CLASS}> · {conversationDateLabel}</span>
      ) : null}
      {conversation.careType ? (
        <span className={MESSAGES_META_TEXT_MUTED_CLASS}> · {conversation.careType}</span>
      ) : null}
    </>
  );

  const headerActions = (
    <>
      {conversation.bookingId ? (
        <Link
          href={bookingDetailsHref(conversation.bookingId)}
          className="inline-flex items-center rounded-full px-2.5 py-1.5 text-[0.6875rem] font-medium text-brand-teal hover:bg-[#DDEEDF] sm:px-2 sm:py-1"
        >
          {m.viewBooking}
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => setReportOpen(true)}
        className={`inline-flex items-center rounded-full px-2.5 py-1.5 text-[0.6875rem] font-medium sm:px-2 sm:py-1 ${MESSAGES_META_TEXT_CLASS} ${MESSAGES_SOFT_HOVER_CLASS}`}
      >
        {ts.reportUser}
      </button>
      <button
        type="button"
        onClick={() => void handleBlockToggle()}
        className={`inline-flex items-center rounded-full px-2.5 py-1.5 text-[0.6875rem] font-medium sm:px-2 sm:py-1 ${MESSAGES_META_TEXT_CLASS} ${MESSAGES_SOFT_HOVER_CLASS}`}
      >
        {blockedByMe ? ts.unblockUser : ts.blockUser}
      </button>
    </>
  );

  return (
    <div className={MESSAGES_CHAT_ROOT_CLASS}>
      <header className={`${MESSAGES_HEADER_CLASS} flex flex-col gap-2`}>
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

          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <h2 className="min-w-0 truncate text-sm font-semibold text-[#2B2B2B]">{displayName}</h2>
              <span
                className={`${statusDisplay.badgeClasses} w-fit max-w-full shrink-0 !px-1.5 !py-0 !text-[0.5625rem]`}
              >
                {statusDisplay.label}
              </span>
            </div>
            <p
              className={`mt-0.5 hidden min-w-0 text-[0.6875rem] leading-snug [overflow-wrap:anywhere] lg:block ${MESSAGES_META_TEXT_CLASS}`}
            >
              {bookingMeta}
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-0.5 lg:flex">{headerActions}</div>
        </div>

        <p
          className={`min-w-0 pl-[5.25rem] text-[0.6875rem] leading-snug [overflow-wrap:anywhere] lg:hidden ${MESSAGES_META_TEXT_CLASS}`}
        >
          {bookingMeta}
        </p>

        <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-2 lg:hidden">{headerActions}</div>
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
          supabase={supabase}
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

      {uploading ? (
        <div className="mx-3 mb-1 shrink-0" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-2 text-xs text-[#2B2B2B]">
            <span>{ui.uploading}</span>
            <span>{uploadProgress ?? 0}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E8E2D6]">
            <div
              className="h-full rounded-full bg-brand-teal transition-[width] duration-150"
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSend} className={`${MESSAGES_INPUT_BAR_CLASS} min-w-0`}>
        {emojiOpen ? (
          <div className="mb-1.5 flex flex-wrap gap-1">
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
        <div className="flex min-w-0 items-end gap-1 sm:gap-1.5">
          <ChatMediaAttachButton
            disabled={sending || uploading || !canSend}
            onFileSelected={(file) => {
              void handleMediaSelected(file);
            }}
          />
          <button
            type="button"
            onClick={() => setEmojiOpen((v) => !v)}
            disabled={!canSend || uploading}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base sm:h-10 sm:w-10 ${MESSAGES_META_TEXT_MUTED_CLASS} ${MESSAGES_SOFT_HOVER_CLASS} disabled:opacity-40`}
            aria-label={ui.insertEmoji}
          >
            😊
          </button>
          <label htmlFor={`message_body_${conversationId}`} className="sr-only">
            {m.typeMessage}
          </label>
          <AutoResizeTextarea
            ref={messageInputRef}
            id={`message_body_${conversationId}`}
            minRows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={inputPlaceholder}
            disabled={sending || uploading || !canSend}
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
            disabled={sending || uploading || !canSend || !draft.trim()}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-brand-teal px-3 text-xs font-semibold text-white hover:bg-brand-teal-hover disabled:opacity-50 sm:h-10 sm:px-4"
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
        role={membershipRole}
        returnTo={membershipReturnTo}
        onClose={() => setUpgradeOpen(false)}
        promotionEligible={promotionEligible}
      />

      {toastMounted && successToast
        ? createPortal(
            <div
              className="pointer-events-none fixed inset-x-0 bottom-6 z-[99999] flex justify-center px-3 sm:bottom-8"
              role="status"
              aria-live="polite"
            >
              <div className="rounded-2xl border border-brand-teal/30 bg-mint/90 px-4 py-3 text-sm font-medium text-brand-teal shadow-lg backdrop-blur-sm">
                {successToast}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
