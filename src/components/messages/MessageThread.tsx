"use client";

import {
  buildThreadSections,
  formatMessageTime,
  getMessagePositionInGroup,
  messageBubbleRadius,
  type ChatMessage,
} from "@/lib/messaging";
import { ChatMessageMedia } from "@/components/messages/ChatMessageMedia";
import { useLanguage } from "@/context/LanguageContext";
import {
  MESSAGES_AVATAR_RING_CLASS,
  MESSAGES_DATE_DIVIDER_CLASS,
  MESSAGES_META_TEXT_CLASS,
  MESSAGES_META_TEXT_MUTED_CLASS,
  MESSAGES_RECEIVED_BUBBLE_CLASS,
} from "@/lib/messages-ui";
import type { SupabaseClient } from "@supabase/supabase-js";

type MessageThreadProps = {
  messages: ChatMessage[];
  loading: boolean;
  emptyTitle: string;
  emptyHint: string;
  incomingAvatarUrl?: string | null;
  incomingInitial?: string;
  supabase: SupabaseClient;
};

function DateDivider({ label }: { label: string }) {
  return (
    <div className="my-2 flex justify-center py-0.5" role="separator">
      <span className={MESSAGES_DATE_DIVIDER_CLASS}>[ {label} ]</span>
    </div>
  );
}

function IncomingAvatar({
  url,
  initial,
}: {
  url: string | null | undefined;
  initial: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`h-7 w-7 shrink-0 rounded-full object-cover ${MESSAGES_AVATAR_RING_CLASS}`}
      />
    );
  }

  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DDEEDF] text-[0.625rem] font-semibold text-brand-teal ${MESSAGES_AVATAR_RING_CLASS}`}
    >
      {initial}
    </div>
  );
}

export function MessageThread({
  messages,
  loading,
  emptyTitle,
  emptyHint,
  incomingAvatarUrl,
  incomingInitial = "?",
  supabase,
}: MessageThreadProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center py-8">
        <p className={`text-sm ${MESSAGES_META_TEXT_CLASS}`}>{t.messages.loadingThread}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 text-center">
        <p className="text-xl" aria-hidden>
          👋
        </p>
        <p className="mt-2 text-sm font-semibold text-[#2B2B2B]">{emptyTitle}</p>
        <p className={`mt-1 max-w-xs text-xs leading-relaxed ${MESSAGES_META_TEXT_MUTED_CLASS}`}>
          {emptyHint}
        </p>
      </div>
    );
  }

  const sections = buildThreadSections(messages);

  return (
    <div className="flex min-h-full flex-col justify-end px-1 py-2 sm:px-2">
      {sections.map((section) => (
        <div key={section.dateKey}>
          <DateDivider label={section.label} />
          <div className="space-y-2">
            {section.groups.map((group, groupIndex) => {
              const showIncomingAvatar = !group.isOwn;
              const groupKey = `${section.dateKey}-${groupIndex}-${group.messages[0]?.id ?? groupIndex}`;

              return (
                <div
                  key={groupKey}
                  className={`flex gap-2 ${group.isOwn ? "flex-row-reverse" : "flex-row"}`}
                >
                  {showIncomingAvatar ? (
                    <div className="w-7 shrink-0 self-end">
                      <IncomingAvatar
                        url={incomingAvatarUrl}
                        initial={incomingInitial}
                      />
                    </div>
                  ) : null}

                  <div
                    className={`flex min-w-0 max-w-[min(100%,16rem)] flex-col gap-0.5 sm:max-w-[18rem] ${
                      group.isOwn ? "items-end" : "items-start"
                    }`}
                  >
                    {group.messages.map((message, messageIndex) => {
                      const position = getMessagePositionInGroup(
                        messageIndex,
                        group.messages.length,
                      );
                      const isLastInGroup = messageIndex === group.messages.length - 1;
                      const radius = messageBubbleRadius(group.isOwn, position);

                      return (
                        <div
                          key={message.id}
                          className={`message-fade-in flex flex-col ${
                            group.isOwn ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`max-w-full px-3 py-1.5 ${radius} ${
                              group.isOwn
                                ? "bg-brand-teal text-white shadow-sm shadow-brand-teal/20"
                                : MESSAGES_RECEIVED_BUBBLE_CLASS
                            }`}
                          >
                            {message.storagePath && message.mediaType ? (
                              <ChatMessageMedia
                                message={message}
                                supabase={supabase}
                                isOwn={group.isOwn}
                              />
                            ) : null}
                            {message.body.trim() ? (
                              <p
                                className={`whitespace-pre-wrap break-words text-[0.8125rem] leading-snug ${
                                  message.storagePath && message.mediaType ? "mt-1.5" : ""
                                }`}
                              >
                                {message.body}
                              </p>
                            ) : null}
                          </div>
                          {isLastInGroup ? (
                            <p
                              className={`mt-0.5 px-1 text-[0.625rem] tabular-nums ${MESSAGES_META_TEXT_MUTED_CLASS}`}
                            >
                              {formatMessageTime(message.createdAt)}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
