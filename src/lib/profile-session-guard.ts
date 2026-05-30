/** Legacy / defensive keys — cleared on sign-out so stale profile rows cannot leak across sessions. */
export const PROFILE_CLIENT_STORAGE_KEYS = [
  "staywithmypet:profile",
  "staywithmypet:profile-cache",
  "swm_profile",
] as const;

export const PROFILE_SESSION_MISMATCH_PARAM = "profile_session";

export function isProfileOwnedByUser(
  profileId: string | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (!profileId || !userId) return false;
  return profileId === userId;
}

export function assertProfileMatchesUser(
  profileId: string,
  userId: string,
): void {
  if (!isProfileOwnedByUser(profileId, userId)) {
    throw new Error("Profile session mismatch");
  }
}

export function clearProfileClientStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of PROFILE_CLIENT_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // ignore quota / private mode
    }
  }
}
