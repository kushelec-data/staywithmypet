"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  MapPin,
  MessageCircle,
  Pause,
  PawPrint,
  Play,
  RotateCcw,
  Star,
  User,
} from "lucide-react";
import { AppImage } from "@/components/ui/AppImage";
import { IMAGES } from "@/lib/images";

const SCENE_DURATION_MS = 4500;
const TICK_MS = 50;

type ExplainerVariant = "pet-parent" | "pet-friend";

type SceneVariant =
  | "add-pet"
  | "profile"
  | "pet-friends"
  | "pet-cards"
  | "care-request"
  | "chat"
  | "booking"
  | "spend-time"
  | "reviews";

const PET_PARENT_SCENE_VARIANTS: SceneVariant[] = [
  "pet-friends",
  "care-request",
  "booking",
  "chat",
  "reviews",
];

const PET_FRIEND_SCENE_VARIANTS: SceneVariant[] = [
  "profile",
  "pet-cards",
  "spend-time",
  "chat",
  "reviews",
];

const PET_PARENT_IMAGE_PATHS = IMAGES.video.petParent;
const PET_FRIEND_IMAGE_PATHS = IMAGES.video.petFriend;

const SCENE_FALLBACK_IMAGES = [
  IMAGES.pets.luna,
  IMAGES.pets.buddy,
  IMAGES.pets.charlie,
  IMAGES.pets.daisy,
  IMAGES.pets.mochi,
  IMAGES.pets.pepper,
] as const;

const PET_CARD_IMAGES = [IMAGES.pets.luna, IMAGES.pets.mochi, IMAGES.pets.charlie] as const;
const PET_CARD_EMOJIS = ["🐕", "🐾", "🦮"] as const;

const FRIEND_CARD_IMAGES = [IMAGES.profiles.maria, IMAGES.profiles.alex, IMAGES.profiles.chris] as const;

type ExplainerSceneCopy = {
  title: string;
  caption: string;
  imageAlt: string;
  modalTitle?: string;
  modalCta?: string;
  messages?: readonly { from: string; text: string }[];
  confirmedLabel?: string;
  reviewText?: string;
  reviewer?: string;
  spendLabel?: string;
};

export type ExplainerMockCopy = {
  ariaLabel: string;
  scenes: readonly ExplainerSceneCopy[];
  pets?: readonly { name: string; breed: string }[];
  petFriends?: readonly { name: string; role: string }[];
};

type ExplainerVideoMockProps = {
  variant: ExplainerVariant;
  copy: ExplainerMockCopy;
  controls: {
    play: string;
    pause: string;
    replay: string;
    muteLabel: string;
    goToScene: string;
  };
  /** When false, playback pauses on the first scene (orchestrated dual-card sections). */
  isPlaybackActive?: boolean;
  /** Fired once when all scenes have played (for alternating cards). */
  onSequenceComplete?: () => void;
};

function sceneVariantsFor(variant: ExplainerVariant): SceneVariant[] {
  return variant === "pet-parent" ? PET_PARENT_SCENE_VARIANTS : PET_FRIEND_SCENE_VARIANTS;
}

function sceneImagesFor(variant: ExplainerVariant): readonly string[] {
  return variant === "pet-parent" ? PET_PARENT_IMAGE_PATHS : PET_FRIEND_IMAGE_PATHS;
}

function SceneBackground({
  src,
  fallback,
  alt,
  seed,
  caption,
  emoji,
  isActive,
  prefersReducedMotion,
  journeyVariant,
}: {
  src: string;
  fallback: string;
  alt: string;
  seed: string;
  caption: string;
  emoji: string;
  isActive: boolean;
  prefersReducedMotion: boolean;
  journeyVariant: ExplainerVariant;
}) {
  const [imageSrc, setImageSrc] = useState(src);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    setImageSrc(src);
    setExhausted(false);
  }, [src]);

  const zoomClass =
    prefersReducedMotion || !isActive
      ? "scale-100"
      : "scale-[1.02] motion-safe:transition-transform motion-safe:duration-[4500ms] motion-safe:ease-out";

  return (
    <div className={`absolute inset-0 overflow-hidden ${zoomClass}`}>
      <AppImage
        key={exhausted ? `placeholder-${seed}` : imageSrc}
        src={exhausted ? "" : imageSrc}
        alt={alt}
        seed={seed}
        fallbackCaption={caption}
        fallbackEmoji={emoji}
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
        onError={() => {
          if (imageSrc !== fallback) {
            setImageSrc(fallback);
            return;
          }
          setExhausted(true);
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/88 via-black/55 to-black/30"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-black/35" aria-hidden />
      {journeyVariant === "pet-parent" ? (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-teal/25 via-transparent to-transparent"
          aria-hidden
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-brand-pink/20 via-transparent to-amber-500/10"
          aria-hidden
        />
      )}
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl ${
          journeyVariant === "pet-parent" ? "bg-brand-teal/35" : "bg-brand-pink/30"
        }`}
        aria-hidden
      />
    </div>
  );
}

function SceneCaption({
  title,
  caption,
  isActive,
  animate,
  journeyVariant,
}: {
  title: string;
  caption: string;
  isActive: boolean;
  animate: boolean;
  journeyVariant: ExplainerVariant;
}) {
  return (
    <div
      className={`absolute inset-x-3 bottom-[4.25rem] z-20 sm:inset-x-4 sm:bottom-[4.75rem] ${
        animate && isActive ? "motion-safe:hero-story-text-in" : ""
      }`}
      key={isActive ? title : undefined}
    >
      <div
        className={`rounded-2xl border px-3 py-2.5 shadow-xl backdrop-blur-md sm:px-4 sm:py-3 ${
          journeyVariant === "pet-parent"
            ? "border-brand-teal/30 bg-black/72"
            : "border-brand-pink/25 bg-black/72"
        }`}
      >
        <p className="line-clamp-2 font-heading text-base font-bold leading-tight text-white sm:text-lg">
          {title}
        </p>
        <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-white/90 sm:text-sm">
          {caption}
        </p>
      </div>
    </div>
  );
}

function AddPetOverlay({ isActive, animate }: { isActive: boolean; animate: boolean }) {
  return (
    <div className="absolute inset-x-3 bottom-14 z-20 sm:inset-x-6 sm:bottom-16">
      <div
        className={`rounded-2xl border border-white/50 bg-white/95 p-4 shadow-xl sm:p-5 ${
          animate && isActive ? "motion-safe:explainer-slide-up" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/50 ring-2 ring-brand-teal/20">
            <PawPrint className="h-7 w-7 text-brand-teal" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Paula</p>
            <p className="text-xs font-medium text-muted">Golden mix · Friendly · Vaccinated</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Walks only", "Home visits", "Overnight care / 24h stay"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-teal/10 px-2 py-0.5 text-[10px] font-semibold text-brand-teal"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileOverlay({ isActive, animate }: { isActive: boolean; animate: boolean }) {
  return (
    <div className="absolute inset-x-3 bottom-14 z-20 sm:inset-x-6 sm:bottom-16">
      <div
        className={`rounded-2xl border border-white/50 bg-white/95 p-4 shadow-xl sm:p-5 ${
          animate && isActive ? "motion-safe:explainer-slide-up" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-brand-teal/25">
            <AppImage
              src={IMAGES.profiles.alex}
              alt=""
              seed="explainer-friend-profile"
              fallbackCaption="You"
              fallbackEmoji="👤"
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">Alex · Pet Friend</p>
            <p className="text-xs font-medium text-muted">Walks, visits · Weekends free</p>
          </div>
          <span className="rounded-full bg-brand-teal px-2.5 py-1 text-[10px] font-bold text-white">
            Live
          </span>
        </div>
      </div>
    </div>
  );
}

function PetCardsOverlay({
  pets,
  isActive,
  animate,
}: {
  pets: readonly { name: string; breed: string }[];
  isActive: boolean;
  animate: boolean;
}) {
  return (
    <div className="absolute inset-x-3 bottom-14 z-20 flex flex-col gap-2 sm:inset-x-5 sm:bottom-16 sm:gap-2.5">
      {pets.map((pet, index) => (
        <div
          key={pet.name}
          className={`flex items-center gap-3 rounded-2xl border border-white/50 bg-white/92 px-3 py-2.5 shadow-lg shadow-black/10 backdrop-blur-sm sm:px-4 sm:py-3 ${
            animate && isActive ? "motion-safe:explainer-card-in" : ""
          }`}
          style={animate && isActive ? { animationDelay: `${index * 180}ms` } : undefined}
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-mint/40 ring-2 ring-brand-teal/15 sm:h-12 sm:w-12">
            <AppImage
              src={PET_CARD_IMAGES[index] ?? IMAGES.pets.buddy}
              alt={pet.name}
              seed={`explainer-pet-${pet.name}`}
              fallbackCaption={pet.name}
              fallbackEmoji={PET_CARD_EMOJIS[index] ?? "🐾"}
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{pet.name}</p>
            <p className="truncate text-xs font-medium text-muted">{pet.breed}</p>
          </div>
          <span className="shrink-0 rounded-full bg-brand-teal/10 px-2 py-0.5 text-[10px] font-semibold text-brand-teal">
            Nearby
          </span>
        </div>
      ))}
    </div>
  );
}

function PetFriendsOverlay({
  friends,
  isActive,
  animate,
}: {
  friends: readonly { name: string; role: string }[];
  isActive: boolean;
  animate: boolean;
}) {
  return (
    <div className="absolute inset-x-3 bottom-14 z-20 flex flex-col gap-2 sm:inset-x-5 sm:bottom-16 sm:gap-2.5">
      {friends.map((friend, index) => (
        <div
          key={friend.name}
          className={`flex items-center gap-3 rounded-2xl border border-white/50 bg-white/92 px-3 py-2.5 shadow-lg shadow-black/10 backdrop-blur-sm sm:px-4 sm:py-3 ${
            animate && isActive ? "motion-safe:explainer-card-in" : ""
          }`}
          style={animate && isActive ? { animationDelay: `${index * 180}ms` } : undefined}
        >
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-mint/40 ring-2 ring-brand-teal/15 sm:h-12 sm:w-12">
            <AppImage
              src={FRIEND_CARD_IMAGES[index] ?? IMAGES.profiles.maria}
              alt={friend.name}
              seed={`explainer-friend-${friend.name}`}
              fallbackCaption={friend.name}
              fallbackEmoji="👤"
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{friend.name}</p>
            <p className="truncate text-xs font-medium text-muted">{friend.role}</p>
          </div>
          <span className="shrink-0 flex items-center gap-0.5 text-brand-teal" aria-hidden>
            <Star className="h-3 w-3 fill-brand-teal" strokeWidth={0} />
            <span className="text-[10px] font-bold">4.9</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function CareRequestOverlay({
  modalTitle,
  modalCta,
  isActive,
  animate,
}: {
  modalTitle: string;
  modalCta: string;
  isActive: boolean;
  animate: boolean;
}) {
  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const selected = new Set([12, 13, 14]);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-6">
      <div
        className={`w-full max-w-[13rem] rounded-2xl border border-white/60 bg-white/95 p-3 shadow-xl sm:max-w-[14rem] sm:p-4 ${
          animate && isActive ? "motion-safe:explainer-slide-up" : ""
        }`}
      >
        <div className="mb-2 flex items-center gap-2 text-brand-teal">
          <Calendar className="h-4 w-4" strokeWidth={2} aria-hidden />
          <span className="text-xs font-semibold">March 2026</span>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted">
          {weekdays.map((d) => (
            <span key={d}>{d}</span>
          ))}
          {days.map((d) => (
            <span
              key={d}
              className={`flex h-5 w-5 items-center justify-center rounded-md sm:h-6 sm:w-6 ${
                selected.has(d)
                  ? "bg-brand-teal text-[10px] font-bold text-white"
                  : "text-foreground/80"
              }`}
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      <div
        className={`absolute bottom-12 left-1/2 w-[90%] max-w-[13rem] -translate-x-1/2 rounded-2xl border border-black/5 bg-cream p-3 shadow-2xl dark:border-border sm:bottom-14 sm:max-w-xs sm:p-4 ${
          animate && isActive ? "motion-safe:explainer-slide-up" : ""
        }`}
        style={animate && isActive ? { animationDelay: "350ms" } : undefined}
      >
        <p className="font-heading text-sm font-semibold text-foreground">{modalTitle}</p>
        <p className="mt-1 text-xs font-medium text-muted">Paula · Sat–Mon · Walk & visit</p>
        <button
          type="button"
          tabIndex={-1}
          className="mt-3 w-full rounded-xl bg-brand-teal px-3 py-2 text-xs font-semibold text-white shadow-md"
        >
          {modalCta}
        </button>
      </div>
    </div>
  );
}

function ChatOverlay({
  messages,
  isActive,
  animate,
}: {
  messages: readonly { from: string; text: string }[];
  isActive: boolean;
  animate: boolean;
}) {
  return (
    <div className="absolute inset-x-3 bottom-12 z-20 flex flex-col gap-2 sm:inset-x-5 sm:bottom-14">
      {messages.map((msg, index) => {
        const isMe = msg.from === "me";
        const isPhoto = msg.text.startsWith("[Photo]");
        return (
          <div
            key={`${msg.text}-${index}`}
            className={`flex ${isMe ? "justify-end" : "justify-start"} ${
              animate && isActive ? "motion-safe:explainer-bubble-in" : ""
            }`}
            style={animate && isActive ? { animationDelay: `${index * 220}ms` } : undefined}
          >
            {isPhoto ? (
              <div className="max-w-[72%] overflow-hidden rounded-2xl rounded-br-md border-2 border-white/50 bg-white/95 p-1 shadow-lg">
                <div className="relative aspect-[4/3] w-[7.5rem] overflow-hidden rounded-xl bg-mint/30 sm:w-[8.5rem]">
                  <AppImage
                    src={IMAGES.pets.luna}
                    alt=""
                    seed={`explainer-photo-${index}`}
                    fallbackCaption="Walk update"
                    fallbackEmoji="📷"
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
                <p className="px-2 py-1 text-[10px] font-semibold text-muted">Photo update · walk</p>
              </div>
            ) : (
              <div
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs font-medium leading-snug shadow-md sm:text-sm ${
                  isMe
                    ? "rounded-br-md bg-brand-teal text-white"
                    : "rounded-bl-md border border-white/40 bg-white/95 text-foreground"
                }`}
              >
                {!isMe ? (
                  <MessageCircle className="mb-1 h-3 w-3 text-brand-teal/70" strokeWidth={2} aria-hidden />
                ) : null}
                {msg.text}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BookingOverlay({
  confirmedLabel,
  isActive,
  animate,
}: {
  confirmedLabel: string;
  isActive: boolean;
  animate: boolean;
}) {
  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];
  const confirmed = new Set([12, 13, 14, 15]);

  return (
    <div
      className={`absolute inset-x-3 bottom-12 z-20 sm:inset-x-6 sm:bottom-14 ${
        animate && isActive ? "motion-safe:explainer-slide-up" : ""
      }`}
    >
      <div className="rounded-2xl border border-white/55 bg-white/94 p-3 shadow-xl sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-brand-teal/20">
              <AppImage
                src={IMAGES.profiles.maria}
                alt=""
                seed="explainer-booking-avatar"
                fallbackCaption="Pet Friend"
                fallbackEmoji="👤"
                sizes="36px"
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Care with Alex</p>
              <p className="text-[10px] font-medium text-muted">Paula · 4 days</p>
            </div>
          </div>
          <span className="rounded-full bg-brand-teal/15 px-2 py-0.5 text-[10px] font-bold text-brand-teal">
            {confirmedLabel}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px]">
          {weekdays.map((d) => (
            <span key={d} className="font-medium text-muted">
              {d}
            </span>
          ))}
          {Array.from({ length: 14 }, (_, i) => i + 8).map((d) => (
            <span
              key={d}
              className={`flex h-6 w-6 items-center justify-center rounded-lg sm:h-7 sm:w-7 ${
                confirmed.has(d) ? "bg-brand-teal font-semibold text-white" : "bg-mint/30 text-foreground/70"
              }`}
            >
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpendTimeOverlay({
  label,
  isActive,
  animate,
}: {
  label: string;
  isActive: boolean;
  animate: boolean;
}) {
  return (
    <div className="absolute inset-x-3 bottom-14 z-20 sm:inset-x-6 sm:bottom-16">
      <div
        className={`flex items-center gap-3 rounded-2xl border border-white/50 bg-white/95 p-4 shadow-xl sm:p-5 ${
          animate && isActive ? "motion-safe:explainer-slide-up" : ""
        }`}
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-2 ring-brand-teal/20">
          <AppImage
            src={IMAGES.pets.luna}
            alt="Paula"
            seed="explainer-spend-time-pet"
            fallbackCaption="Paula"
            fallbackEmoji="🐕"
            sizes="56px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{label}</p>
          <p className="mt-0.5 text-xs font-medium text-muted">Park walk · 45 min · Photo update sent</p>
          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-pink/10 px-2 py-0.5 text-[10px] font-semibold text-brand-pink">
            <span aria-hidden>📷</span> Update shared with Pet Parent
          </p>
        </div>
        <MapPin className="h-5 w-5 shrink-0 text-brand-teal" strokeWidth={2} aria-hidden />
      </div>
    </div>
  );
}

function ReviewsOverlay({
  reviewText,
  reviewer,
  isActive,
  animate,
}: {
  reviewText: string;
  reviewer: string;
  isActive: boolean;
  animate: boolean;
}) {
  return (
    <div
      className={`absolute inset-x-3 bottom-12 z-20 sm:inset-x-6 sm:bottom-14 ${
        animate && isActive ? "motion-safe:explainer-slide-up" : ""
      }`}
    >
      <div className="rounded-2xl border border-white/50 bg-white/95 p-4 shadow-xl">
        <div className="flex gap-0.5 text-brand-teal" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-brand-teal" strokeWidth={0} />
          ))}
        </div>
        <p className="mt-2 text-sm font-medium leading-snug text-foreground">&ldquo;{reviewText}&rdquo;</p>
        <p className="mt-2 text-xs font-semibold text-muted">{reviewer}</p>
      </div>
    </div>
  );
}

function SceneOverlays({
  sceneVariant,
  scene,
  copy,
  isActive,
  animate,
}: {
  sceneVariant: SceneVariant;
  scene: ExplainerSceneCopy & { variant: SceneVariant };
  copy: ExplainerMockCopy;
  isActive: boolean;
  animate: boolean;
}) {
  switch (sceneVariant) {
    case "add-pet":
      return <AddPetOverlay isActive={isActive} animate={animate} />;
    case "profile":
      return <ProfileOverlay isActive={isActive} animate={animate} />;
    case "pet-cards":
      return (
        <PetCardsOverlay pets={copy.pets ?? []} isActive={isActive} animate={animate} />
      );
    case "pet-friends":
      return (
        <PetFriendsOverlay friends={copy.petFriends ?? []} isActive={isActive} animate={animate} />
      );
    case "care-request":
      if (scene.modalTitle && scene.modalCta) {
        return (
          <CareRequestOverlay
            modalTitle={scene.modalTitle}
            modalCta={scene.modalCta}
            isActive={isActive}
            animate={animate}
          />
        );
      }
      return null;
    case "chat":
      if (scene.messages) {
        return <ChatOverlay messages={scene.messages} isActive={isActive} animate={animate} />;
      }
      return null;
    case "booking":
      if (scene.confirmedLabel) {
        return (
          <BookingOverlay
            confirmedLabel={scene.confirmedLabel}
            isActive={isActive}
            animate={animate}
          />
        );
      }
      return null;
    case "spend-time":
      return (
        <SpendTimeOverlay
          label={scene.spendLabel ?? "Care time in progress"}
          isActive={isActive}
          animate={animate}
        />
      );
    case "reviews":
      if (scene.reviewText && scene.reviewer) {
        return (
          <ReviewsOverlay
            reviewText={scene.reviewText}
            reviewer={scene.reviewer}
            isActive={isActive}
            animate={animate}
          />
        );
      }
      return null;
    default:
      return null;
  }
}

export function ExplainerVideoMock({
  variant,
  copy,
  controls,
  isPlaybackActive = true,
  onSequenceComplete,
}: ExplainerVideoMockProps) {
  const sceneCount = copy.scenes.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(isPlaybackActive);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [ended, setEnded] = useState(false);
  const elapsedRef = useRef(0);

  const sceneVariants = sceneVariantsFor(variant);
  const imagePaths = sceneImagesFor(variant);

  const scenes = useMemo(
    () =>
      copy.scenes.map((scene, index) => ({
        ...scene,
        variant: sceneVariants[index]!,
        image: imagePaths[index] ?? imagePaths[0]!,
        fallback: SCENE_FALLBACK_IMAGES[index % SCENE_FALLBACK_IMAGES.length]!,
        emoji: ["🐾", "👤", "📅", "💬", "✓", "★"][index] ?? "🐾",
      })),
    [copy.scenes, sceneVariants, imagePaths],
  );

  const fadeTransition = prefersReducedMotion
    ? "transition-none"
    : "transition-opacity duration-700 ease-in-out";

  const animateOverlays = !prefersReducedMotion;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isPlaybackActive) {
      setIsPlaying(false);
      setActiveIndex(0);
      setSceneProgress(0);
      elapsedRef.current = 0;
      setEnded(false);
      return;
    }
    setActiveIndex(0);
    setSceneProgress(0);
    elapsedRef.current = 0;
    setEnded(false);
    setIsPlaying(true);
  }, [isPlaybackActive]);

  const goToScene = useCallback(
    (index: number) => {
      setActiveIndex(Math.max(0, Math.min(sceneCount - 1, index)));
      setSceneProgress(0);
      elapsedRef.current = 0;
      setEnded(false);
    },
    [sceneCount],
  );

  const handleReplay = useCallback(() => {
    goToScene(0);
    setIsPlaying(true);
  }, [goToScene]);

  useEffect(() => {
    if (!isPlaybackActive || !isPlaying || prefersReducedMotion || ended) return;

    const interval = setInterval(() => {
      elapsedRef.current += TICK_MS;
      const progress = Math.min(elapsedRef.current / SCENE_DURATION_MS, 1);
      setSceneProgress(progress);

      if (progress >= 1) {
        elapsedRef.current = 0;
        setSceneProgress(0);
        setActiveIndex((prev) => {
          if (prev >= sceneCount - 1) {
            setEnded(true);
            setIsPlaying(false);
            onSequenceComplete?.();
            return prev;
          }
          return prev + 1;
        });
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [
    isPlaybackActive,
    isPlaying,
    prefersReducedMotion,
    ended,
    activeIndex,
    sceneCount,
    onSequenceComplete,
  ]);

  useEffect(() => {
    elapsedRef.current = 0;
    setSceneProgress(0);
  }, [activeIndex]);

  useEffect(() => {
    if (!isPlaybackActive || !prefersReducedMotion || !onSequenceComplete) return;
    const timeout = window.setTimeout(() => onSequenceComplete(), SCENE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [isPlaybackActive, prefersReducedMotion, onSequenceComplete]);

  const overallProgress = ((activeIndex + (ended ? 1 : sceneProgress)) / sceneCount) * 100;

  return (
    <div className="w-full min-w-0">
      <div
        role="region"
        aria-label={copy.ariaLabel}
        className={`relative w-full overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5 ${
          variant === "pet-parent"
            ? "bg-gradient-to-br from-mint/40 via-cream/90 to-brand-teal/10 shadow-brand-teal/15"
            : "bg-gradient-to-br from-cream/80 via-surface to-brand-pink/10 shadow-brand-pink/10"
        } ${!isPlaybackActive ? "opacity-90" : ""}`}
      >
        <div className="relative h-[min(360px,62vw)] w-full sm:h-[min(400px,48vw)]" aria-live="polite">
          {scenes.map((scene, index) => {
            const isActive = index === activeIndex;
            return (
              <article
                key={`${variant}-${scene.title}`}
                className={`absolute inset-0 ${fadeTransition} ${
                  isActive ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
                }`}
                aria-hidden={!isActive}
              >
                <SceneBackground
                  src={scene.image}
                  fallback={scene.fallback}
                  alt={scene.imageAlt}
                  seed={`explainer-${variant}-${index}`}
                  caption={scene.caption}
                  emoji={scene.emoji}
                  isActive={isActive}
                  prefersReducedMotion={prefersReducedMotion}
                  journeyVariant={variant}
                />

                <SceneCaption
                  title={scene.title}
                  caption={scene.caption}
                  isActive={isActive}
                  animate={animateOverlays}
                  journeyVariant={variant}
                />

                <SceneOverlays
                  sceneVariant={scene.variant}
                  scene={scene}
                  copy={copy}
                  isActive={isActive}
                  animate={animateOverlays}
                />
              </article>
            );
          })}

          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-24 bg-gradient-to-t from-black/50 to-transparent"
            aria-hidden
          />

          <div className="absolute bottom-3 left-3 right-3 z-40 flex items-center gap-2 sm:bottom-4 sm:left-4 sm:right-4">
            <button
              type="button"
              onClick={() => {
                if (ended) {
                  handleReplay();
                  return;
                }
                setIsPlaying((p) => !p);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/95 text-brand-teal shadow-md ring-1 ring-black/5 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal sm:h-10 sm:w-10"
              aria-label={ended ? controls.replay : isPlaying ? controls.pause : controls.play}
            >
              {ended ? (
                <RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden />
              ) : isPlaying ? (
                <Pause className="h-4 w-4" strokeWidth={2} aria-hidden />
              ) : (
                <Play className="h-4 w-4 pl-0.5" strokeWidth={2} aria-hidden />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-black/30"
                role="progressbar"
                aria-valuenow={Math.round(overallProgress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={copy.ariaLabel}
              >
                <div
                  className={`h-full rounded-full bg-brand-teal ${prefersReducedMotion ? "" : "transition-[width] duration-150 ease-linear"}`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between gap-0.5">
                {scenes.map((scene, index) => (
                  <button
                    key={`${variant}-dot-${scene.title}`}
                    type="button"
                    onClick={() => goToScene(index)}
                    className={`h-1 flex-1 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white ${
                      index <= activeIndex ? "bg-white/90" : "bg-white/35 hover:bg-white/55"
                    }`}
                    aria-label={controls.goToScene.replace("{n}", String(index + 1))}
                  />
                ))}
              </div>
            </div>

            <span className="sr-only">{controls.muteLabel}</span>
          </div>
        </div>
      </div>

      {ended ? (
        <p className="mt-3 text-center">
          <button
            type="button"
            onClick={handleReplay}
            className="text-xs font-semibold text-brand-teal underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-teal"
          >
            {controls.replay}
          </button>
        </p>
      ) : null}
    </div>
  );
}

export { HowItWorksExplainerSection } from "@/components/how-it-works/ExplainerJourneySection";
