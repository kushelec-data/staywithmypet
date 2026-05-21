"use client";

import { Button } from "@/components/ui/Button";
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
      window.prompt("Copy your public profile link:", url);
    }
  }, [profileId]);

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
        {copied ? "Link copied" : "Copy public profile link"}
      </Button>
      {copied ? (
        <span className="text-xs font-medium text-brand-teal" role="status">
          Link copied to clipboard
        </span>
      ) : null}
    </div>
  );
}
