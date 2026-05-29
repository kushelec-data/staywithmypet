"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { absolutePublicPetUrl } from "@/lib/site-url";
import { Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type SharePublicPetLinkButtonProps = {
  petId: string;
  petName: string;
  size?: "sm" | "md";
  className?: string;
};

export function SharePublicPetLinkButton({
  petId,
  petName,
  size = "sm",
  className = "",
}: SharePublicPetLinkButtonProps) {
  const { t } = useLanguage();
  const copy = t.petPublicProfile;
  const [shared, setShared] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const shareLink = useCallback(async () => {
    const url = absolutePublicPetUrl(petId);
    const shareData = {
      title: petName,
      text: copy.shareText.replace("{name}", petName),
      url,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShared(false), 2500);
    } catch {
      window.prompt(copy.shareFallbackPrompt, url);
    }
  }, [copy.shareFallbackPrompt, copy.shareText, petId, petName]);

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={className}
      onClick={() => void shareLink()}
    >
      <Share2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      {shared ? copy.linkCopied : copy.share}
    </Button>
  );
}
