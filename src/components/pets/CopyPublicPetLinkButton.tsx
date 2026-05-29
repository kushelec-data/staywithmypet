"use client";

import { Button } from "@/components/ui/Button";
import { absolutePublicPetUrl } from "@/lib/site-url";
import { Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type CopyPublicPetLinkButtonProps = {
  petId: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "soft";
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  label?: string;
  copiedLabel?: string;
  iconOnly?: boolean;
  tooltip?: string;
};

export function CopyPublicPetLinkButton({
  petId,
  variant = "outline",
  size = "sm",
  className = "",
  disabled = false,
  label = "Copy link",
  copiedLabel = "Link copied",
  iconOnly = false,
  tooltip = "Copy public profile link",
}: CopyPublicPetLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copyLink = useCallback(async () => {
    const url = absolutePublicPetUrl(petId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this pet's public link:", url);
    }
  }, [petId]);

  const title = copied ? copiedLabel : tooltip;

  if (iconOnly) {
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        disabled={disabled}
        onClick={() => void copyLink()}
        className={`btn-interactive inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E5E2D8] bg-[#F8F6F1] text-foreground shadow-sm transition-colors hover:border-[#2E6B3F]/30 hover:bg-[#DDEEDF] hover:text-[#2E6B3F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6B3F] disabled:opacity-50 ${className}`}
      >
        <Copy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={() => void copyLink()}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}
