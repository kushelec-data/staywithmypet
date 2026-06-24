"use client";

import {
  hasRenderableProfileInitials,
  resolveProfileAvatarInitials,
  resolveSanitizedAvatarUrl,
} from "@/lib/profile-avatar-display";
import { PositionedPhoto } from "@/components/media/PositionedPhoto";
import type { PhotoObjectPosition } from "@/lib/photo-position";

type ProfileAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

type ProfileAvatarProps = {
  userId: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  avatarPosition?: PhotoObjectPosition | null;
  size?: ProfileAvatarSize;
  shape?: "circle" | "rounded" | "rounded-xl";
  className?: string;
  imageClassName?: string;
  loading?: boolean;
  /** AppImage sizes attribute when using fill layout in a sized container. */
  sizes?: string;
};

const SIZE_CLASS: Record<ProfileAvatarSize, string> = {
  xs: "h-8 w-8 text-[0.65rem]",
  sm: "h-9 w-9 text-xs",
  md: "h-16 w-16 text-xl sm:h-[4.5rem] sm:w-[4.5rem] sm:text-xl",
  lg: "h-20 w-20 text-2xl",
  xl: "h-24 w-24 text-3xl sm:h-28 sm:w-28",
};

const SHAPE_CLASS = {
  circle: "rounded-full",
  rounded: "rounded-2xl",
  "rounded-xl": "rounded-xl",
} as const;

function GenericProfileIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
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

/**
 * Unified member avatar — never falls back to another user's photo or initials.
 * Fallback order: sanitized avatar → subject initials → generic profile icon.
 */
export function ProfileAvatar({
  userId,
  displayName,
  email,
  avatarUrl,
  avatarPosition,
  size = "md",
  shape = "rounded",
  className = "",
  imageClassName = "object-cover",
  loading = false,
  sizes,
}: ProfileAvatarProps) {
  const shell = `${SIZE_CLASS[size]} ${SHAPE_CLASS[shape]} ${className}`.trim();
  const initials = resolveProfileAvatarInitials(displayName, email);
  const safeUrl = resolveSanitizedAvatarUrl(userId, avatarUrl);

  if (loading) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-[#E8E4DC] font-semibold text-[#5C5C5C] ${shell}`}
        aria-hidden
      >
        …
      </div>
    );
  }

  if (safeUrl) {
    if (sizes) {
      return (
        <div className={`relative shrink-0 overflow-hidden ${shell}`}>
          <PositionedPhoto
            src={safeUrl}
            alt=""
            seed={userId}
            position={avatarPosition}
            sizes={sizes}
            className={imageClassName}
          />
        </div>
      );
    }

    return (
      <div className={`relative shrink-0 overflow-hidden ${shell}`}>
        <PositionedPhoto
          src={safeUrl}
          alt=""
          position={avatarPosition}
          useAppImage={false}
          className={imageClassName}
        />
      </div>
    );
  }

  if (hasRenderableProfileInitials(initials)) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-[#E8E4DC] font-semibold text-[#2E6B3F] ${shell}`}
        aria-hidden
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-[#E8E4DC] text-[#5C5C5C] ${shell}`}
      aria-hidden
    >
      <GenericProfileIcon className="h-[45%] w-[45%]" />
    </div>
  );
}
