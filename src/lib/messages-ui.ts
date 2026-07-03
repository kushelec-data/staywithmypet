/**
 * Messages UI — warm light palette (fixed; not tied to site dark mode).
 */
export const MESSAGES_COLORS = {
  panelBorder: "#E4DED2",
  conversationBg: "#F9F6EF",
  threadBg: "#F7F4EC",
  headerBg: "#F6F2EA",
  inputBarBg: "#F6F2EA",
  receivedBubble: "#FDFBF6",
  inputBg: "#FFFFFF",
  inputText: "#2B2B2B",
  placeholder: "#8A8276",
  metaText: "#6B6559",
  metaTextMuted: "#8A8276",
  hoverSurface: "#EDE8DC",
  dateDividerBg: "#EDE8DC",
  bannerBg: "#F3EFE6",
} as const;

export const MESSAGES_PANEL_CLASS =
  "messages-area flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[20px] border border-[#E4DED2] bg-[#F9F6EF] shadow-[0_1px_2px_rgba(46,107,63,0.05)]";

export const MESSAGES_CHAT_ROOT_CLASS =
  "flex h-full min-h-0 min-w-0 flex-1 flex-col bg-[#F9F6EF] text-[#2B2B2B]";

export const MESSAGES_HEADER_CLASS =
  "sticky top-0 z-10 shrink-0 border-b border-[#E4DED2] bg-[#F6F2EA]/95 px-3 py-2.5 text-[#2B2B2B] backdrop-blur-sm sm:px-4";

export const MESSAGES_THREAD_SCROLL_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain scroll-smooth bg-[#F7F4EC] px-2 sm:px-3";

export const MESSAGES_INPUT_BAR_CLASS =
  "sticky bottom-0 z-10 shrink-0 border-t border-[#E4DED2] bg-[#F6F2EA] px-3 py-2.5 sm:px-4";

export const MESSAGES_TEXTAREA_CLASS =
  "max-h-24 min-h-[40px] min-w-0 flex-1 rounded-full border border-[#E4DED2] bg-white px-4 py-2 text-sm leading-snug text-[#2B2B2B] placeholder:text-[#8A8276] outline-none transition focus:border-brand-teal/50 focus:ring-2 focus:ring-brand-teal/15 disabled:cursor-not-allowed disabled:opacity-60";

export const MESSAGES_RECEIVED_BUBBLE_CLASS =
  "border border-[#E4DED2] bg-[#FDFBF6] text-[#2B2B2B] shadow-sm";

export const MESSAGES_META_TEXT_CLASS = "text-[#6B6559]";

export const MESSAGES_META_TEXT_MUTED_CLASS = "text-[#8A8276]";

export const MESSAGES_AVATAR_RING_CLASS = "ring-1 ring-[#E4DED2]";

export const MESSAGES_SOFT_HOVER_CLASS = "hover:bg-[#EDE8DC]";

export const MESSAGES_DATE_DIVIDER_CLASS =
  "rounded-full bg-[#EDE8DC] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[#8A8276]";
