"use client";

import { Button } from "@/components/ui/Button";
import { useProfile } from "@/context/ProfileContext";
import { useAuth } from "@/context/AuthContext";
import type { ProfileRow } from "@/lib/profile-utils";
import { languageOptions } from "@/lib/legacy/search-filters";
import { GooglePlacesInput } from "@/components/location/GooglePlacesInput";
import {
  finalizeLocationText,
  locationInputDisplayValue,
  shortLocationLabel,
} from "@/lib/google-places-parse";
import { getGoogleMapsApiKey } from "@/lib/google-places-loader";
import { PROFILE_LOCATION_CITY_OPTIONS, PROFILE_LOCATION_DATALIST_ID } from "@/lib/location-datalist";
import { resolveProfileDisplayName } from "@/lib/profile-display-name";
import { BioWordCounter } from "@/components/profile/BioWordCounter";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import { ProfileGalleryUpload } from "@/components/profile/ProfileGalleryUpload";
import { ProfileRoleStatusCard } from "@/components/profile/ProfileRoleStatusCard";
import { AvailabilityCalendar } from "@/components/calendar/AvailabilityCalendar";
import { PetFriendProfileFormSections } from "@/components/profile/PetFriendProfileFormSections";
import { ProfileCollapsibleSection } from "@/components/profile/ProfileCollapsibleSection";
import {
  TrustSafetyFormSection,
  type TrustSafetyFormValues,
  emptyTrustSafetyFormValues,
} from "@/components/profile/TrustSafetyFormSection";
import {
  parseDialCodeFromE164,
  DEFAULT_PHONE_DIAL_CODE,
} from "@/lib/phone-eu";
import { parseEmergencyContactFromProfile } from "@/lib/trust-safety";
import { notifyDashboardRefresh } from "@/lib/dashboard-refresh";
import {
  emptyPetFriendProfileForm,
  petFriendFormFromDetailsRaw,
  type PetFriendProfileFormInput,
} from "@/lib/profile-friend-form";
import { saveUserProfile, type ProfileRole, type ProfileSetupInput } from "@/lib/profile-setup";
import { createClient } from "@/lib/supabase";
import { availabilityUxForProfile } from "@/lib/availability-ux";
import { resolveActiveMode } from "@/lib/profile-mode";
import {
  BIO_WORD_MAX,
  BIO_WORD_MIN,
  bioWordStatus,
  countBioWords,
  isBioWordCountValid,
  normalizeBioForSave,
  truncateBioToMaxWords,
} from "@/lib/bio-words";
import { bioPlaceholderForRole } from "@/lib/profile-bio-placeholder";
import { selectableChipClass } from "@/lib/form-field-styles";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { useLanguage } from "@/context/LanguageContext";
import { translateProfileLabel } from "@/lib/profile-translations";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DASHBOARD_PATH = "/dashboard";

type ProfileSetupFormProps = {
  submitLabel?: string;
  /** Hide role picker after onboarding; show status card instead. */
  hideRolePicker?: boolean;
};

function applyProfileToForm(
  profile: ProfileRow,
  setters: {
    setDisplayName: (v: string) => void;
    setRole: (v: ProfileRole) => void;
    setLocation: (v: string) => void;
    setAddress: (v: string) => void;
    setLatitude: (v: number | null) => void;
    setLongitude: (v: number | null) => void;
    setAvailabilitySelectedDates: (v: string[]) => void;
    setLanguages: (v: string[]) => void;
    setBio: (v: string) => void;
    setTrustSafety: (v: TrustSafetyFormValues) => void;
    setGooglePlaceId: (v: string | null) => void;
    setAvatarUrl: (v: string | null) => void;
  },
) {
  setters.setAvatarUrl(profile.avatar_url?.trim() || null);
  setters.setDisplayName(profile.display_name?.trim() ?? "");
  setters.setRole(profile.role ?? "pet_friend");
  setters.setLocation(profile.location?.trim() ?? "");
  setters.setAddress(profile.address?.trim() ?? "");
  const rawDetails = profile.details as Record<string, unknown> | undefined;
  const pid = rawDetails?.google_place_id;
  setters.setGooglePlaceId(typeof pid === "string" && pid.trim() ? pid.trim() : null);
  setters.setLatitude(profile.latitude ?? null);
  setters.setLongitude(profile.longitude ?? null);
  const sched = profile.details?.availability_schedule;
  setters.setAvailabilitySelectedDates(normalizeAvailabilityDates(sched?.selected_dates ?? []));
  setters.setLanguages([...(profile.languages ?? [])]);
  setters.setBio(profile.bio?.trim() ?? "");
  const emergency = parseEmergencyContactFromProfile(profile);
  const mainE164 = profile.phone_e164?.trim() || profile.phone?.trim() || "";
  const mainParts = parseDialCodeFromE164(mainE164 || null);
  const ecParts = parseDialCodeFromE164(emergency?.phone ?? null);
  setters.setTrustSafety({
    phoneDialCode: profile.phone_country_code?.trim() || mainParts.dialCode,
    phoneNational: profile.phone_number?.trim() || mainParts.nationalDigits,
    emergencyName: emergency?.name ?? "",
    emergencyDialCode: profile.emergency_contact_phone_country_code?.trim() || ecParts.dialCode,
    emergencyNational: profile.emergency_contact_phone_number?.trim() || ecParts.nationalDigits,
    emergencyRelationship:
      emergency?.relationship ?? profile.details?.emergency_contact_relationship ?? "",
  });
}

export function ProfileSetupForm({
  submitLabel,
  hideRolePicker = false,
}: ProfileSetupFormProps) {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const setup = t.account.profileSetup;
  const pe = t.profileEdit.basic;
  const onboardingRole = t.onboarding.role;
  const resolvedSubmitLabel = submitLabel ?? setup.submitLabel;
  const roleOptions = useMemo(
    (): { value: ProfileRole; label: string; description: string }[] => [
      {
        value: "pet_parent",
        label: t.roles.petParent.label,
        description: onboardingRole.petParentDescription,
      },
      {
        value: "pet_friend",
        label: t.roles.petFriend.label,
        description: onboardingRole.petFriendDescription,
      },
      {
        value: "both",
        label: setup.roleBoth,
        description: setup.roleBothDescription,
      },
    ],
    [t.roles.petParent.label, t.roles.petFriend.label, onboardingRole, setup],
  );
  const { user } = useAuth();
  const { profile, loading: profileLoading, refreshProfile, setProfileRow } = useProfile();
  const supabase = useMemo(() => createClient(), []);

  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<ProfileRole>("pet_friend");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [availabilitySelectedDates, setAvailabilitySelectedDates] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [trustSafety, setTrustSafety] = useState<TrustSafetyFormValues>(emptyTrustSafetyFormValues);
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [petFriendForm, setPetFriendForm] = useState<PetFriendProfileFormInput>(
    emptyPetFriendProfileForm,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeMode = resolveActiveMode(profile?.role ?? role, profile?.active_mode);
  const availabilityUx = availabilityUxForProfile(profile?.role ?? role, activeMode);

  const setters = useMemo(
    () => ({
      setDisplayName,
      setRole,
      setLocation,
      setAddress,
      setLatitude,
      setLongitude,
      setAvailabilitySelectedDates,
      setLanguages,
      setBio,
      setTrustSafety,
      setGooglePlaceId,
      setAvatarUrl,
    }),
    [],
  );

  function handleAvatarUpdated(url: string) {
    setAvatarUrl(url);
    if (profile) {
      setProfileRow({ ...profile, avatar_url: url });
    } else {
      void refreshProfile({ background: true });
    }
    notifyDashboardRefresh();
  }

  function handleProfileGalleryUpdated(updated: ProfileRow) {
    setAvatarUrl(updated.avatar_url?.trim() || null);
    setProfileRow(updated);
    void refreshProfile({ background: true });
    notifyDashboardRefresh();
  }

  const locationFieldValue = locationInputDisplayValue(address, location);
  const showFriendProfileSections = role === "pet_friend" || role === "both";
  const bioWordCount = useMemo(() => countBioWords(bio), [bio]);
  const bioStatus = bioWordStatus(bioWordCount);
  const bioValid = isBioWordCountValid(bioWordCount);
  const bioPlaceholder = useMemo(
    () => bioPlaceholderForRole(role, setup.bioPlaceholders),
    [role, setup.bioPlaceholders],
  );

  function handleBioChange(next: string) {
    const count = countBioWords(next);
    setBio(count > BIO_WORD_MAX ? truncateBioToMaxWords(next) : next);
  }

  useEffect(() => {
    if (profileLoading) return;

    if (profile) {
      applyProfileToForm(profile, setters);
      setPetFriendForm(
        petFriendFormFromDetailsRaw(
          profile.details,
          normalizeAvailabilityDates(
            profile.details?.availability_schedule?.selected_dates ?? [],
          ),
        ),
      );
      if (!profile.display_name?.trim() && user) {
        setDisplayName(resolveProfileDisplayName(user, null));
      }
      return;
    }

    if (user) {
      setDisplayName(resolveProfileDisplayName(user, null));
    } else {
      setDisplayName("");
    }
    setRole("pet_friend");
    setLocation("");
    setAddress("");
    setLatitude(null);
    setLongitude(null);
    setAvailabilitySelectedDates([]);
    setLanguages([]);
    setBio("");
    setTrustSafety(emptyTrustSafetyFormValues);
    setGooglePlaceId(null);
    setAvatarUrl(null);
    setPetFriendForm(emptyPetFriendProfileForm());
  }, [profile, profileLoading, user, setters]);

  function toggleLanguage(lang: string) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError(pe.errorDisplayName);
      return;
    }
    const locationText = finalizeLocationText(locationFieldValue);
    if (!locationText) {
      setError(pe.errorLocation);
      return;
    }
    if (languages.length === 0) {
      setError(pe.errorLanguages);
      return;
    }
    if (!bioValid) {
      setError(
        bioWordCount < BIO_WORD_MIN
          ? pe.errorBioMin
          : pe.errorBioMax.replace("{max}", String(BIO_WORD_MAX)),
      );
      return;
    }

    const hasGoogleCoords = latitude != null && longitude != null;
    const ecName =
      trustSafety.emergencyName.trim() || profile?.emergency_contact_name?.trim() || "";
    const ecNational =
      trustSafety.emergencyNational.trim() ||
      profile?.emergency_contact_phone_number?.trim() ||
      "";
    const ecDial =
      trustSafety.emergencyDialCode ||
      profile?.emergency_contact_phone_country_code?.trim() ||
      DEFAULT_PHONE_DIAL_CODE;
    const ecRelationship = trustSafety.emergencyRelationship.trim() || null;
    const hasEmergency = Boolean(ecName || ecNational || ecRelationship);

    const payload: ProfileSetupInput = {
      displayName: trimmedName,
      role,
      location: hasGoogleCoords ? finalizeLocationText(location) || locationText : locationText,
      languages: [...languages],
      bio: normalizeBioForSave(bio),
      phoneDialCode: trustSafety.phoneDialCode || DEFAULT_PHONE_DIAL_CODE,
      phoneNational: trustSafety.phoneNational,
      emergencyContact: hasEmergency
        ? {
            name: ecName,
            dialCode: ecDial,
            national: ecNational,
            relationship: ecRelationship,
          }
        : null,
      address: hasGoogleCoords ? finalizeLocationText(address) || locationText : locationText,
      latitude,
      longitude,
      availabilitySelectedDates,
      googlePlaceId: hasGoogleCoords ? googlePlaceId : null,
      petFriend: showFriendProfileSections
        ? {
            ...petFriendForm,
            availabilitySelectedDates: normalizeAvailabilityDates(
              petFriendForm.availabilitySelectedDates.length
                ? petFriendForm.availabilitySelectedDates
                : availabilitySelectedDates,
            ),
          }
        : null,
    };

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await saveUserProfile(supabase, user.id, payload, {
        user,
        existingDisplayName: profile?.display_name ?? (trimmedName || null),
        preserveRole: profile?.role_chosen_at ? profile.role : undefined,
      });
      setProfileRow(saved);
      applyProfileToForm(saved, setters);
      await refreshProfile();
      notifyDashboardRefresh();
      const { sendProfileCompletedEmailAction } = await import("@/app/actions/email-events");
      void sendProfileCompletedEmailAction();
      setSuccess(setup.profileSavedSuccess);
      router.push(DASHBOARD_PATH);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : setup.saveError;
      console.error("[profile] save failed in form", message);
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (profileLoading) {
    return <p className="text-sm text-muted">{setup.loadingProfile}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="account-card space-y-6 p-6 sm:p-8">
      {success ? (
        <p className="rounded-xl bg-mint/50 px-3 py-2 text-sm font-medium text-brand-teal" role="status">
          {success}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-4">
        <ProfileCollapsibleSection
          id="about-me"
          title={setup.aboutMeTitle}
          description={setup.aboutMeDescriptionIntro}
          defaultOpen
        >
        {user ? (
          <div className="sm:col-span-2 rounded-2xl border border-black/5 bg-surface/80 p-4 sm:p-5">
            <ProfileAvatarUpload
              userId={user.id}
              displayName={displayName || profile?.display_name || "User"}
              email={user.email}
              avatarUrl={avatarUrl}
              onAvatarUpdated={handleAvatarUpdated}
              disabled={saving}
            />
            <ProfileGalleryUpload
              userId={user.id}
              profile={profile}
              avatarUrl={avatarUrl}
              onProfileUpdated={handleProfileGalleryUpdated}
              disabled={saving}
            />
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <label htmlFor="display_name" className="form-field-label">
            {setup.displayName}
          </label>
          <input
            id="display_name"
            name="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoComplete="name"
            className="input-field mt-1"
            placeholder={setup.displayNamePlaceholder}
          />
        </div>

        {hideRolePicker && profile?.role_chosen_at ? (
          <div className="sm:col-span-2">
            <ProfileRoleStatusCard profile={profile} />
          </div>
        ) : (
          <fieldset className="sm:col-span-2">
            <legend className="form-field-label">{setup.yourRole}</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {roleOptions.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-2xl border p-4 transition-colors ${
                    role === option.value
                      ? "border-brand-teal/40 bg-mint/40 ring-1 ring-brand-teal/20"
                      : "border-black/5 bg-surface hover:bg-mint/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => setRole(option.value)}
                    className="sr-only"
                  />
                  <span className="font-heading text-sm font-semibold text-foreground">{option.label}</span>
                  <p className="mt-1 text-xs text-muted">{option.description}</p>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="sm:col-span-2">
          <label htmlFor="location" className="form-field-label">
            {setup.location}
          </label>
          <GooglePlacesInput
            id="location"
            name="location"
            value={locationFieldValue}
            onChange={(text) => {
              setLocation(text);
              setAddress(text);
              setLatitude(null);
              setLongitude(null);
              setGooglePlaceId(null);
            }}
            onPlaceSelect={(place) => {
              setLocation(shortLocationLabel(place));
              setAddress(place.formatted_address);
              setLatitude(place.latitude);
              setLongitude(place.longitude);
              setGooglePlaceId(place.place_id);
            }}
            required
            autoComplete="street-address"
            className="input-field mt-1"
            placeholder={setup.locationPlaceholder}
            datalistId={PROFILE_LOCATION_DATALIST_ID}
          />
          <datalist id={PROFILE_LOCATION_DATALIST_ID}>
            {PROFILE_LOCATION_CITY_OPTIONS.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-muted">
            {getGoogleMapsApiKey() ? setup.locationGoogleHint : setup.locationCityHint}
          </p>
        </div>

        {availabilityUx.showPersonalAvailabilityEditor && !showFriendProfileSections ? (
          <div className="sm:col-span-2 rounded-2xl border border-black/5 bg-mint/15 p-4 sm:p-5">
          <p className="form-field-label">{setup.myAvailability}</p>
          <p className="mt-1 text-xs text-muted">{setup.myAvailabilityHint}</p>
          <div className="mt-4">
            <div className="rounded-2xl border-2 border-brand-teal/25 bg-surface/90 p-3 shadow-sm ring-1 ring-black/5 sm:p-4">
              <AvailabilityCalendar
                selectedDates={availabilitySelectedDates}
                onChange={setAvailabilitySelectedDates}
                disabled={saving}
                petFriendId={user?.id ?? null}
                viewRole="pet-friend"
              />
            </div>
          </div>
        </div>
        ) : null}

        {availabilityUx.showPetCareDates &&
        (!availabilityUx.showPersonalAvailabilityEditor || (profile?.role ?? role) === "both") ? (
          <div className="sm:col-span-2 rounded-2xl border border-black/5 bg-mint/15 p-4 sm:p-5">
            <p className="form-field-label">{setup.petCareAvailability}</p>
            <p className="mt-1 text-xs text-muted">
              {setup.petCareAvailabilityHint}{" "}
              <a href="/pets" className="font-semibold text-brand-teal hover:text-brand-pink">
                {setup.petCareAvailabilityLink}
              </a>{" "}
              {setup.petCareAvailabilitySuffix}
            </p>
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <span className="form-field-label">{setup.languages}</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {languageOptions.map((lang) => {
              const selected = languages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={selectableChipClass(selected)}
                >
                  {translateProfileLabel(lang, locale)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="bio" className="form-field-label">
            {setup.bioLabel}
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            value={bio}
            onChange={(e) => handleBioChange(e.target.value)}
            required
            className="input-field mt-1 resize-y"
            placeholder={bioPlaceholder}
            aria-describedby="bio-word-counter"
          />
          <BioWordCounter id="bio-word-counter" wordCount={bioWordCount} status={bioStatus} />
        </div>
        </ProfileCollapsibleSection>

        <TrustSafetyFormSection
          values={trustSafety}
          emailVerified={Boolean(user?.email_confirmed_at)}
          phoneVerified={Boolean(profile?.phone_verified)}
          onChange={setTrustSafety}
          disabled={saving}
        />

        {showFriendProfileSections ? (
          <PetFriendProfileFormSections
            form={petFriendForm}
            onChange={setPetFriendForm}
            disabled={saving}
            showCalendar={availabilityUx.showPersonalAvailabilityEditor}
            petFriendId={user?.id ?? null}
          />
        ) : null}
      </div>

      <Button type="submit" variant="primary" disabled={saving || !bioValid}>
        {saving ? t.common.saving : resolvedSubmitLabel}
      </Button>
    </form>
  );
}
