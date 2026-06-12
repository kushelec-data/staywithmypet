"use client";

import {
  buildThreadSections,
  formatMessageTime,
  getMessagePositionInGroup,
  messageBubbleRadius,
  type ChatMessage,
} from "@/lib/messaging";
import { useLanguage } from "@/context/LanguageContext";

type MessageThreadProps = {
  messages: ChatMessage[];
  loading: boolean;
  emptyTitle: string;
  emptyHint: string;
  incomingAvatarUrl?: string | null;
  incomingInitial?: string;
};

function DateDivider({ label }: { label: string }) {
  return (
    <div className="my-2 flex justify-center py-0.5" role="separator">
      <span className="rounded-full bg-black/[0.05] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[#4b4b4b]/75 dark:bg-white/[0.06] dark:text-muted">
        [ {label} ]
      </span>
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
        className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
      />
    );
  }

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lavender/50 text-[0.625rem] font-semibold text-brand-teal ring-1 ring-black/5 dark:ring-white/10">
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
}: MessageThreadProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-8">
        <p className="text-sm text-[#4b4b4b] dark:text-muted">{t.messages.loadingThread}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <p className="text-xl" aria-hidden>
          👋
        </p>
        <p className="mt-2 text-sm font-semibold text-foreground">{emptyTitle}</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#4b4b4b] dark:text-muted">
          {emptyHint}
        </p>
      </div>
    );
  }

  const sections = buildThreadSections(messages);

  return (
    <div className="flex min-h-full flex-1 flex-col justify-end px-1 py-2 sm:px-2">
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
                                : "border border-black/[0.06] bg-[#fffaf2] text-foreground shadow-sm dark:border-white/10 dark:bg-surface"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words text-[0.8125rem] leading-snug">
                              {message.body}
                            </p>
                          </div>
                          {isLastInGroup ? (
                            <p className="mt-0.5 px-1 text-[0.625rem] tabular-nums text-[#4b4b4b] dark:text-muted">
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
