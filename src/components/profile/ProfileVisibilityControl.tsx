"use client";

import { STATUS_ALERT_SUCCESS_CLASS } from "@/lib/status-colors";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { notifyDashboardRefresh } from "@/lib/dashboard-refresh";
import { updateProfilePublicVisibility } from "@/lib/profile-visibility";
import { createClient } from "@/lib/supabase";
import { useMemo, useState } from "react";

export function ProfileVisibilityControl() {
  const { t } = useLanguage();
  const copy = t.profileEdit.visibility;
  const { user } = useAuth();
  const { profile, setProfileRow } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user?.id || !profile) return null;

  const checked = profile.is_public !== false;

  async function handleChange(next: boolean) {
    if (!user?.id || !profile) return;
    const previous = profile.is_public;
    setProfileRow({ ...profile, is_public: next });
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await updateProfilePublicVisibility(supabase, user.id, next);
      setSuccess(true);
      notifyDashboardRefresh();
    } catch (err) {
      setProfileRow({ ...profile, is_public: previous });
      setError(err instanceof Error ? err.message : copy.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{copy.title}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
            checked ? "bg-mint/40 text-[#2E6B3F]" : "bg-[#E8E4DC] text-[#5C5C5C]"
          }`}
        >
          {checked ? copy.statusPublic : copy.statusHidden}
        </span>
      </div>
      <label className="mt-2 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/20 text-brand-teal focus:ring-2 focus:ring-brand-teal/40 disabled:opacity-50"
          checked={checked}
          disabled={saving}
          onChange={(event) => void handleChange(event.target.checked)}
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">{copy.toggleLabel}</span>
          <span className="mt-1 block text-sm text-muted">{copy.helper}</span>
        </span>
      </label>
      {success ? (
        <p className={`mt-2 text-sm ${STATUS_ALERT_SUCCESS_CLASS}`} role="status">
          {copy.updated}
        </p>
      ) : null}
      {saving ? (
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {copy.saving}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
