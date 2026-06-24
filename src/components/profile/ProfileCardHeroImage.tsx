"use client";

import { PositionedPhoto } from "@/components/media/PositionedPhoto";
import {
  hasRenderableProfileInitials,
  resolveProfileAvatarInitials,
  resolveSanitizedAvatarUrl,
} from "@/lib/profile-avatar-display";
import type { PhotoObjectPosition } from "@/lib/photo-position";

function GenericProfileIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5 20c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

type ProfileCardHeroImageProps = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarPosition?: PhotoObjectPosition | null;
  compact?: boolean;
};

/** Full-width profile photo for search/saved cards — matches PetCard image layout. */
export function ProfileCardHeroImage({
  userId,
  displayName,
  avatarUrl,
  avatarPosition,
  compact = false,
}: ProfileCardHeroImageProps) {
  const safeUrl = resolveSanitizedAvatarUrl(userId, avatarUrl);
  const initials = resolveProfileAvatarInitials(displayName, null);

  return (
    <div
      className={`relative w-full bg-mint/20 ${
        compact ? "h-[240px] max-h-[240px]" : "aspect-[4/3]"
      }`}
    >
      {safeUrl ? (
        <PositionedPhoto
          src={safeUrl}
          alt={displayName}
          seed={userId}
          position={avatarPosition}
          fallbackCaption={displayName}
          sizes={
            compact
              ? "(max-width: 640px) 100vw, 320px"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
          }
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : hasRenderableProfileInitials(initials) ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-[#E8E4DC] font-heading text-4xl font-semibold text-[#2E6B3F] sm:text-5xl"
          aria-hidden
        >
          {initials}
        </div>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-[#E8E4DC] text-[#5C5C5C]"
          aria-hidden
        >
          <GenericProfileIcon className="h-16 w-16 sm:h-20 sm:w-20" />
        </div>
      )}
    </div>
  );
}
