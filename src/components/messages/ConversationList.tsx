"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  formatInboxTime,
  resolveConversationStatusDisplay,
  type ConversationSummary,
} from "@/lib/messaging";
import {
  ACCOUNT_LIST_ITEM_ACTIVE_CLASS,
  ACCOUNT_LIST_ITEM_INACTIVE_CLASS,
} from "@/lib/account-ui";
import {
  MESSAGES_AVATAR_RING_CLASS,
  MESSAGES_META_TEXT_CLASS,
  MESSAGES_META_TEXT_MUTED_CLASS,
} from "@/lib/messages-ui";

type ConversationListProps = {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  return (
    <ul className="flex flex-col gap-1 p-2.5">
      {conversations.map((conversation) => (
        <ConversationListItem
          key={conversation.id}
          conversation={conversation}
          active={conversation.id === selectedId}
          onSelect={() => onSelect(conversation.id)}
        />
      ))}
    </ul>
  );
}

function ConversationListItem({
  conversation,
  active,
  onSelect,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useLanguage();
  const thumbUrl = conversation.petPhotoUrl ?? conversation.otherPartyAvatarUrl;
  const displayName = conversation.petName ?? conversation.threadTitle;
  const hasUnread = conversation.unreadCount > 0;
  const statusDisplay = resolveConversationStatusDisplay(conversation);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full min-w-0 items-start gap-2.5 px-2.5 py-2 text-left transition-colors ${
          active ? ACCOUNT_LIST_ITEM_ACTIVE_CLASS : ACCOUNT_LIST_ITEM_INACTIVE_CLASS
        }`}
      >
        <ConversationThumb url={thumbUrl} alt={displayName} name={conversation.otherPartyName} />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-1.5">
            <span
              className={`line-clamp-1 text-[0.8125rem] leading-tight ${
                hasUnread ? "font-bold text-[#2B2B2B]" : "font-semibold text-[#2B2B2B]"
              }`}
            >
              {displayName}
            </span>
            {conversation.lastMessageAt ? (
              <span className={`shrink-0 text-[0.625rem] tabular-nums ${MESSAGES_META_TEXT_MUTED_CLASS}`}>
                {formatInboxTime(conversation.lastMessageAt)}
              </span>
            ) : null}
          </span>

          <span className={`mt-px block min-w-0 text-[0.6875rem] leading-snug ${MESSAGES_META_TEXT_CLASS}`}>
            <span className="font-medium">{conversation.otherPartyName}</span>
            {conversation.dateLabel ? (
              <span className={`break-words ${MESSAGES_META_TEXT_MUTED_CLASS}`}>
                {" "}
                · {conversation.dateLabel}
              </span>
            ) : null}
          </span>

          {conversation.lastMessagePreview ? (
            <span
              className={`mt-0.5 block line-clamp-1 text-[0.6875rem] leading-snug ${
                hasUnread ? "font-medium text-[#2B2B2B]" : MESSAGES_META_TEXT_CLASS
              }`}
            >
              {conversation.lastMessagePreview}
            </span>
          ) : (
            <span className={`mt-0.5 block text-[0.6875rem] italic ${MESSAGES_META_TEXT_MUTED_CLASS}`}>
              {t.messages.noMessagesYet}
            </span>
          )}
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
          {hasUnread ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1e5c42] px-1.5 text-[0.625rem] font-bold leading-none text-white">
              {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
            </span>
          ) : null}
          <span
            className={`${statusDisplay.badgeClasses} max-w-[5.5rem] truncate !px-1.5 !py-0 !text-[0.5625rem] sm:max-w-none`}
            title={statusDisplay.label}
          >
            {statusDisplay.label}
          </span>
        </span>
      </button>
    </li>
  );
}

function ConversationThumb({
  url,
  alt,
  name,
}: {
  url: string | null;
  alt: string;
  name: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`h-9 w-9 shrink-0 rounded-full object-cover ${MESSAGES_AVATAR_RING_CLASS}`}
      />
    );
  }

  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DDEEDF] text-xs font-semibold text-brand-teal ${MESSAGES_AVATAR_RING_CLASS}`}>
      {initial}
    </div>
  );
}
