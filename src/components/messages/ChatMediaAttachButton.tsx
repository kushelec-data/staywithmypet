"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  CHAT_IMAGE_ACCEPT,
  CHAT_MEDIA_ACCEPT,
  CHAT_VIDEO_ACCEPT,
} from "@/lib/chat-media";
import { MESSAGES_META_TEXT_MUTED_CLASS, MESSAGES_SOFT_HOVER_CLASS } from "@/lib/messages-ui";

type ChatMediaAttachButtonProps = {
  disabled?: boolean;
  onFileSelected: (file: File) => void;
};

export function ChatMediaAttachButton({
  disabled = false,
  onFileSelected,
}: ChatMediaAttachButtonProps) {
  const { t } = useLanguage();
  const ui = t.messagesUi;
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const libraryInputRef = useRef<HTMLInputElement>(null);
  const photoCaptureInputRef = useRef<HTMLInputElement>(null);
  const videoLibraryInputRef = useRef<HTMLInputElement>(null);
  const videoCaptureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setMenuOpen(false);
    if (file) onFileSelected(file);
  }

  const menuItems = [
    {
      key: "library",
      label: ui.attachPhotoOrVideo,
      onClick: () => libraryInputRef.current?.click(),
    },
    {
      key: "photo",
      label: ui.takePhoto,
      onClick: () => photoCaptureInputRef.current?.click(),
    },
    {
      key: "video-library",
      label: ui.chooseVideo,
      onClick: () => videoLibraryInputRef.current?.click(),
    },
    {
      key: "video",
      label: ui.recordVideo,
      onClick: () => videoCaptureInputRef.current?.click(),
    },
  ];

  return (
    <div ref={rootRef} className="relative shrink-0">
      <input
        ref={libraryInputRef}
        type="file"
        accept={CHAT_MEDIA_ACCEPT}
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={photoCaptureInputRef}
        type="file"
        accept={CHAT_IMAGE_ACCEPT}
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={videoLibraryInputRef}
        type="file"
        accept={CHAT_VIDEO_ACCEPT}
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={videoCaptureInputRef}
        type="file"
        accept={CHAT_VIDEO_ACCEPT}
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        aria-label={ui.attachPhotoOrVideo}
        onClick={() => setMenuOpen((open) => !open)}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10 ${MESSAGES_META_TEXT_MUTED_CLASS} ${MESSAGES_SOFT_HOVER_CLASS} disabled:opacity-40`}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden
        >
          <path
            d="M15.172 7.172a4 4 0 0 1 0 5.656l-3.182 3.182a4 4 0 1 1-5.656-5.656l1.293-1.293"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.879 15.121 15.121 8.88M9 6h.01M6 9h.01"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          className="absolute bottom-full left-0 z-20 mb-2 w-52 rounded-2xl border border-[#E4DED2] bg-[#FFFBF5] py-1 shadow-lg"
        >
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-[#2B2B2B] hover:bg-[#DDEEDF]/70"
              onClick={item.onClick}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
