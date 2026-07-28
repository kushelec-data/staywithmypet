import type { AnimationClip } from "three";

export type DogIntroPhase =
  | "enter-walk"
  | "idle-look"
  | "jump"
  | "roll"
  | "sit-idle"
  | "lean-cta"
  | "idle-loop";

export const DOG_INTRO_PHASES: DogIntroPhase[] = [
  "enter-walk",
  "idle-look",
  "jump",
  "roll",
  "sit-idle",
  "lean-cta",
  "idle-loop",
];

export const DOG_MODEL_PATH = "/models/membership-dog/dog.glb";

export function findDogAnimationClip(
  clips: AnimationClip[],
  token: string,
  options?: { exclude?: string[] },
): AnimationClip | undefined {
  return clips.find((clip) => {
    if (!clip.name.includes(token)) return false;
    if (options?.exclude?.some((part) => clip.name.includes(part))) return false;
    return true;
  });
}

export function resolveDogClipMap(clips: AnimationClip[]) {
  return {
    walk: findDogAnimationClip(clips, "|Walk"),
    idle: findDogAnimationClip(clips, "|Idle", { exclude: ["Eating"] }),
    idleEating: findDogAnimationClip(clips, "Idle_Eating"),
    jumpStart: findDogAnimationClip(clips, "Jump_Start"),
    jumpLoop: findDogAnimationClip(clips, "Jump_Loop"),
    headbutt: findDogAnimationClip(clips, "Headbutt"),
  };
}

export function phaseDurationMs(phase: DogIntroPhase): number {
  switch (phase) {
    case "enter-walk":
      return 2200;
    case "idle-look":
      return 1400;
    case "jump":
      return 1200;
    case "roll":
      return 900;
    case "sit-idle":
      return 1800;
    case "lean-cta":
      return 1500;
    default:
      return 0;
  }
}

export function isIntroPhase(phase: DogIntroPhase): boolean {
  return phase !== "idle-loop";
}
