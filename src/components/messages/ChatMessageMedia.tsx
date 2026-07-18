"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createChatMediaSignedUrl } from "@/lib/chat-media";
import type { ChatMessage } from "@/lib/messaging";
import { MESSAGES_META_TEXT_MUTED_CLASS } from "@/lib/messages-ui";

type ChatMessageMediaProps = {
  message: ChatMessage;
  supabase: SupabaseClient;
  isOwn: boolean;
};

function ImageLightbox({
  url,
  alt,
  onClose,
}: {
  url: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white"
        onClick={onClose}
      >
        ×
      </button>
      <img
        src={url}
        alt={alt}
        className="max-h-[90vh] max-w-full rounded-lg object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}

export function ChatMessageMedia({ message, supabase, isOwn }: ChatMessageMediaProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(message.storagePath));
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUrl() {
      if (!message.storagePath) {
        setSignedUrl(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const url = await createChatMediaSignedUrl(supabase, message.storagePath);
      if (cancelled) return;
      setSignedUrl(url);
      setLoading(false);
    }

    void loadUrl();
    return () => {
      cancelled = true;
    };
  }, [message.storagePath, supabase]);

  if (!message.storagePath || !message.mediaType) return null;

  if (loading) {
    return (
      <div
        className={`mt-1 h-28 w-full max-w-[14rem] animate-pulse rounded-xl ${
          isOwn ? "bg-white/20" : "bg-[#E8E2D6]"
        }`}
      />
    );
  }

  if (!signedUrl) {
    return (
      <p className={`mt-1 text-[0.6875rem] ${MESSAGES_META_TEXT_MUTED_CLASS}`}>
        Media unavailable
      </p>
    );
  }

  if (message.mediaType === "video") {
    return (
      <div className="mt-1 max-w-[min(100%,14rem)] overflow-hidden rounded-xl">
        <video
          src={signedUrl}
          controls
          playsInline
          preload="metadata"
          className="max-h-52 w-full bg-black object-contain"
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="mt-1 block max-w-[min(100%,14rem)] overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
      >
        <img
          src={signedUrl}
          alt={message.fileName ?? "Shared photo"}
          className="max-h-52 w-full cursor-zoom-in object-cover"
          loading="lazy"
        />
      </button>
      {lightboxOpen ? (
        <ImageLightbox
          url={signedUrl}
          alt={message.fileName ?? "Shared photo"}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </>
  );
}
