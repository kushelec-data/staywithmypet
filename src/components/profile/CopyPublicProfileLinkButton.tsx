"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { absolutePublicProfileUrl } from "@/lib/site-url";
import { useCallback, useEffect, useRef, useState } from "react";

type CopyPublicProfileLinkButtonProps = {
  profileId: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "soft";
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
};

export function CopyPublicProfileLinkButton({
  profileId,
  variant = "outline",
  size = "sm",
  className = "",
  disabled = false,
}: CopyPublicProfileLinkButtonProps) {
  const { t } = useLanguage();
  const dh = t.dashboardHome;
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copyLink = useCallback(async () => {
    const url = absolutePublicProfileUrl(profileId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(dh.copyLinkPrompt, url);
    }
  }, [profileId, dh.copyLinkPrompt]);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={disabled}
        onClick={() => void copyLink()}
      >
        {copied ? dh.linkCopied : dh.copyPublicLink}
      </Button>
      {copied ? (
        <span className="text-xs font-medium text-brand-teal" role="status">
          {dh.linkCopiedClipboard}
        </span>
      ) : null}
    </div>
  );
}
