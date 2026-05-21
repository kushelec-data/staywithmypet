"use client";

import { Button } from "@/components/ui/Button";
import { absolutePublicPetUrl } from "@/lib/site-url";
import { useCallback, useEffect, useRef, useState } from "react";

type CopyPublicPetLinkButtonProps = {
  petId: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "soft";
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  label?: string;
  copiedLabel?: string;
};

export function CopyPublicPetLinkButton({
  petId,
  variant = "outline",
  size = "sm",
  className = "",
  disabled = false,
  label = "Copy link",
  copiedLabel = "Link copied",
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
