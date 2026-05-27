import { notifyDashboardRefresh } from "@/lib/dashboard-refresh";
import type { ProfileActiveMode } from "@/lib/profile-mode";
import { saveUserActiveMode, type ProfileSaveContext } from "@/lib/profile-setup";
import type { ProfileRow } from "@/lib/profile-utils";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type SwitchActiveModeParams = {
  supabase: SupabaseClient;
  user: User;
  profile: ProfileRow;
  targetMode: ProfileActiveMode;
  setProfileRow: (row: ProfileRow) => void;
  refreshProfile: (options?: { background?: boolean }) => Promise<ProfileRow | null>;
};

/** Persist active_mode and refresh client profile state. */
export async function performActiveModeSwitch({
  supabase,
  user,
  profile,
  targetMode,
  setProfileRow,
  refreshProfile,
}: SwitchActiveModeParams): Promise<ProfileRow> {
  const context: ProfileSaveContext = {
    user,
    existingDisplayName: profile.display_name,
  };
  const saved = await saveUserActiveMode(supabase, user.id, targetMode, profile, context);
  setProfileRow(saved);
  const { sendWelcomeForModeSwitchAction } = await import("@/app/actions/email-events");
  void sendWelcomeForModeSwitchAction(targetMode);
  await refreshProfile({ background: true });
  notifyDashboardRefresh();
  return saved;
}
