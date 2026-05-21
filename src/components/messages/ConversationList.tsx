"use client";

import { useLanguage } from "@/context/LanguageContext";
import { formatInboxTime, type ConversationSummary } from "@/lib/messaging";
import { requestStatusBadgeClasses, requestStatusLabel } from "@/lib/requests";

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

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition-colors ${
          active
            ? "bg-mint/70 shadow-sm ring-1 ring-brand-teal/25 dark:bg-mint/25 dark:ring-brand-teal/35"
            : "hover:bg-[#fffaf2]/80 dark:hover:bg-[#35322d]"
        }`}
      >
        <ConversationThumb url={thumbUrl} alt={displayName} name={conversation.otherPartyName} />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-1.5">
            <span
              className={`line-clamp-1 text-[0.8125rem] leading-tight ${
                hasUnread ? "font-bold text-foreground" : "font-semibold text-foreground"
              }`}
            >
              {displayName}
            </span>
            {conversation.lastMessageAt ? (
              <span className="shrink-0 text-[0.625rem] tabular-nums text-[#4b4b4b] dark:text-muted">
                {formatInboxTime(conversation.lastMessageAt)}
              </span>
            ) : null}
          </span>

          <span className="mt-px block line-clamp-1 text-[0.6875rem] leading-tight text-[#4b4b4b] dark:text-muted">
            {conversation.otherPartyName}
            {conversation.dateLabel ? (
              <span className="text-[#4b4b4b]/80 dark:text-muted/80">
                {" "}
                · {conversation.dateLabel}
              </span>
            ) : null}
          </span>

          {conversation.lastMessagePreview ? (
            <span
              className={`mt-0.5 block line-clamp-1 text-[0.6875rem] leading-snug ${
                hasUnread ? "font-medium text-foreground" : "text-[#4b4b4b] dark:text-muted"
              }`}
            >
              {conversation.lastMessagePreview}
            </span>
          ) : (
            <span className="mt-0.5 block text-[0.6875rem] italic text-[#4b4b4b]/80 dark:text-muted/80">
              {t.messages.noMessagesYet}
            </span>
          )}
        </span>

        {hasUnread ? (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#1e5c42] px-1.5 text-[0.625rem] font-bold text-white">
            {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
          </span>
        ) : (
          <span className="mt-1 inline-flex shrink-0 self-end">
            <span
              className={`${requestStatusBadgeClasses(conversation.requestStatus)} !px-1.5 !py-0 !text-[0.5625rem]`}
            >
              {requestStatusLabel(conversation.requestStatus)}
            </span>
          </span>
        )}
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
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/[0.06] dark:ring-white/10"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lavender/50 text-xs font-semibold text-brand-teal ring-1 ring-black/[0.06] dark:ring-white/10">
      {initial}
    </div>
  );
}
