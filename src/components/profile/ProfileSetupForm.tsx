"use client";

import { STATUS_ALERT_ERROR_CLASS } from "@/lib/status-colors";
import { Button } from "@/components/ui/Button";
import { useProfile } from "@/context/ProfileContext";
import { useAuth } from "@/context/AuthContext";
import type { ProfileRow } from "@/lib/profile-utils";
import { ProfileLocationField } from "@/components/profile/ProfileLocationField";
import { resolveProfileDisplayName } from "@/lib/profile-display-name";
import { BioWordCounter } from "@/components/profile/BioWordCounter";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
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
import { normalizeFullName } from "@/lib/name-format";
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
  getWordCount,
  isBioWordCountValid,
  normalizeBioForSave,
  truncateBioToMaxWords,
} from "@/lib/bio-words";
import { ProfileLanguagesSelector } from "@/components/profile/ProfileLanguagesSelector";
import { bioPlaceholderForRole } from "@/lib/profile-bio-placeholder";
import {
  EMPTY_PROFILE_LOCATION_FORM,
  profileLocationFromRow,
  profileLocationToSaveInput,
  type ProfileLocationFormState,
} from "@/lib/profile-location";
import { languagesOtherFromDetails } from "@/lib/profile-languages";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import { useLanguage } from "@/context/LanguageContext";
import { FormDraftStatus } from "@/components/forms/FormDraftStatus";
import { useFormDraftStorage } from "@/hooks/useFormDraftStorage";
import {
  buildProfileSetupDraftFromProfile,
  emptyProfileSetupDraft,
  type ProfileSetupDraftData,
} from "@/lib/form-drafts/profile-setup-draft";
import { ProfileRequiredFieldsBanner } from "@/components/profile/ProfileRequiredFieldsBanner";
import { RequiredFieldLabel, FormFieldError } from "@/components/forms/RequiredFieldLabel";
import { focusFirstInvalidField, requiredFieldOrderProps } from "@/lib/form-field-focus";
import {
  evaluateProfileRequiredFields,
  validateBasicProfileFormSlice,
  validatePetFriendFormSlice,
  type ProfileRequiredFieldId,
} from "@/lib/profile-required-fields";
import { mergePetFriendIntoDetails } from "@/lib/profile-friend-form";
import { formDraftStorageKey } from "@/lib/form-draft-storage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    setProfileLocation: (v: ProfileLocationFormState) => void;
    setAvailabilitySelectedDates: (v: string[]) => void;
    setLanguages: (v: string[]) => void;
    setLanguagesOther: (v: string) => void;
    setBio: (v: string) => void;
    setTrustSafety: (v: TrustSafetyFormValues) => void;
    setAvatarUrl: (v: string | null) => void;
  },
) {
  setters.setAvatarUrl(profile.avatar_url?.trim() || null);
  setters.setDisplayName(profile.display_name?.trim() ?? "");
  setters.setRole(profile.role ?? "pet_friend");
  setters.setProfileLocation(profileLocationFromRow(profile));
  const sched = profile.details?.availability_schedule;
  setters.setAvailabilitySelectedDates(normalizeAvailabilityDates(sched?.selected_dates ?? []));
  setters.setLanguages([...(profile.languages ?? [])]);
  setters.setLanguagesOther(languagesOtherFromDetails(profile.details));
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
  const { t } = useLanguage();
  const setup = t.account.profileSetup;
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
  const [profileLocation, setProfileLocation] = useState<ProfileLocationFormState>(
    EMPTY_PROFILE_LOCATION_FORM,
  );
  const [locationFieldError, setLocationFieldError] = useState<string | null>(null);
  const [availabilitySelectedDates, setAvailabilitySelectedDates] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [languagesOther, setLanguagesOther] = useState("");
  const [bio, setBio] = useState("");
  const [trustSafety, setTrustSafety] = useState<TrustSafetyFormValues>(emptyTrustSafetyFormValues);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [petFriendForm, setPetFriendForm] = useState<PetFriendProfileFormInput>(
    emptyPetFriendProfileForm,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ProfileRequiredFieldId, string>>>({});
  const formInitializedRef = useRef(false);

  const draftKey = useMemo(
    () => (user?.id ? formDraftStorageKey(["profile-setup", user.id]) : ""),
    [user?.id],
  );

  const draftData = useMemo(
    (): ProfileSetupDraftData => ({
      displayName,
      role,
      profileLocation,
      availabilitySelectedDates,
      languages,
      languagesOther,
      bio,
      trustSafety,
      petFriendForm,
    }),
    [
      displayName,
      role,
      profileLocation,
      availabilitySelectedDates,
      languages,
      languagesOther,
      bio,
      trustSafety,
      petFriendForm,
    ],
  );

  const applyProfileSetupDraft = useCallback((draft: ProfileSetupDraftData) => {
    setDisplayName(draft.displayName);
    setRole(draft.role);
    setProfileLocation(draft.profileLocation);
    setAvailabilitySelectedDates([...draft.availabilitySelectedDates]);
    setLanguages([...draft.languages]);
    setLanguagesOther(draft.languagesOther);
    setBio(draft.bio);
    setTrustSafety(draft.trustSafety);
    setPetFriendForm(draft.petFriendForm);
  }, []);

  const { draftStatus, clearDraft, markHydratedFromServer } = useFormDraftStorage({
    key: draftKey,
    data: draftData,
    enabled: Boolean(user?.id && draftKey && !profileLoading),
    onRestore: applyProfileSetupDraft,
  });

  const activeMode = resolveActiveMode(profile?.role ?? role, profile?.active_mode);
  const availabilityUx = availabilityUxForProfile(profile?.role ?? role, activeMode);

  const setters = useMemo(
    () => ({
      setDisplayName,
      setRole,
      setProfileLocation,
      setAvailabilitySelectedDates,
      setLanguages,
      setLanguagesOther,
      setBio,
      setTrustSafety,
      setAvatarUrl,
    }),
    [],
  );

  function handleProfileUpdated(updated: ProfileRow) {
    setAvatarUrl(updated.avatar_url?.trim() || null);
    setProfileRow(updated);
    void refreshProfile({ background: true });
    notifyDashboardRefresh();
  }

  const showFriendProfileSections = role === "pet_friend" || role === "both";
  const bioWordCount = useMemo(() => getWordCount(bio), [bio]);
  const bioValid = isBioWordCountValid(bioWordCount);
  const bioPlaceholder = useMemo(
    () => bioPlaceholderForRole(role, setup.bioPlaceholders),
    [role, setup.bioPlaceholders],
  );

  const setupActiveMode = resolveActiveMode(profile?.role ?? role, profile?.active_mode);

  const requiredFieldsResult = useMemo(() => {
    const locationSave = profileLocationToSaveInput(profileLocation);
    const details = showFriendProfileSections
      ? mergePetFriendIntoDetails(profile?.details ?? {}, {
          ...petFriendForm,
          availabilitySelectedDates: normalizeAvailabilityDates(
            petFriendForm.availabilitySelectedDates.length
              ? petFriendForm.availabilitySelectedDates
              : availabilitySelectedDates,
          ),
        })
      : profile?.details;

    return evaluateProfileRequiredFields({
      profile: {
        display_name: displayName,
        avatar_url: avatarUrl,
        bio,
        languages,
        location: locationSave.location,
        public_location: locationSave.publicLocation ?? null,
        city: locationSave.city ?? null,
        country: locationSave.country ?? null,
        google_place_id: locationSave.googlePlaceId ?? null,
        latitude: locationSave.latitude ?? null,
        longitude: locationSave.longitude ?? null,
        role: profile?.role ?? role,
        active_mode: profile?.active_mode ?? undefined,
        details: details as import("@/lib/profile-details").ProfileDetails,
      },
      activeMode: setupActiveMode,
      petIntros: [],
    });
  }, [
    displayName,
    avatarUrl,
    bio,
    languages,
    profileLocation,
    role,
    profile,
    showFriendProfileSections,
    petFriendForm,
    availabilitySelectedDates,
    setupActiveMode,
  ]);

  function applyValidationIssues(
    issues: { id: ProfileRequiredFieldId; focusId?: string }[],
  ): boolean {
    if (issues.length === 0) {
      setFieldErrors({});
      return true;
    }
    const errorsCopy = t.profileRequiredFields.errors;
    const next: Partial<Record<ProfileRequiredFieldId, string>> = {};
    for (const issue of issues) {
      next[issue.id] = errorsCopy[issue.id as keyof typeof errorsCopy] ?? t.profileRequiredFields.visibilityHint;
    }
    setFieldErrors(next);
    setError(t.profileRequiredFields.visibilityHint);
    focusFirstInvalidField(issues);
    return false;
  }

  function handleBioChange(next: string) {
    const count = getWordCount(next);
    setBio(count > BIO_WORD_MAX ? truncateBioToMaxWords(next) : next);
  }

  useEffect(() => {
    if (profileLoading || formInitializedRef.current) return;

    if (profile) {
      formInitializedRef.current = true;
      const baseline = buildProfileSetupDraftFromProfile(profile);
      const restored = markHydratedFromServer(baseline);
      if (!restored) {
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
      }
      return;
    }

    formInitializedRef.current = true;
    const restored = markHydratedFromServer(emptyProfileSetupDraft());
    if (restored) return;

    if (user) {
      setDisplayName(resolveProfileDisplayName(user, null));
    } else {
      setDisplayName("");
      setRole("pet_friend");
      setProfileLocation(EMPTY_PROFILE_LOCATION_FORM);
      setLocationFieldError(null);
      setAvailabilitySelectedDates([]);
      setLanguages([]);
      setLanguagesOther("");
      setBio("");
      setTrustSafety(emptyTrustSafetyFormValues);
      setAvatarUrl(null);
      setPetFriendForm(emptyPetFriendProfileForm());
    }
  }, [profile, profileLoading, user, setters, markHydratedFromServer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setFieldErrors({});
    const trimmedName = normalizeFullName(displayName);
    setDisplayName(trimmedName);

    const basicIssues = validateBasicProfileFormSlice({
      displayName: trimmedName,
      avatarUrl,
      profileLocation,
      bio,
      languages,
      languagesOther,
    });
    const friendIssues = showFriendProfileSections
      ? validatePetFriendFormSlice({
          ...petFriendForm,
          availabilitySelectedDates: normalizeAvailabilityDates(
            petFriendForm.availabilitySelectedDates.length
              ? petFriendForm.availabilitySelectedDates
              : availabilitySelectedDates,
          ),
        })
      : [];

    if (!applyValidationIssues([...basicIssues, ...friendIssues])) {
      return;
    }

    setLocationFieldError(null);

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
      location: profileLocationToSaveInput(profileLocation),
      languages: [...languages],
      languagesOther,
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
      availabilitySelectedDates,
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
      clearDraft();
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
      <FormDraftStatus status={draftStatus} />
      <ProfileRequiredFieldsBanner result={requiredFieldsResult} />
      {success ? (
        <p className="rounded-xl bg-mint/50 px-3 py-2 text-sm font-medium text-brand-teal" role="status">
          {success}
        </p>
      ) : null}

      {error ? (
        <p className={STATUS_ALERT_ERROR_CLASS} role="alert">
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
          <div
            id="profile-avatar-upload"
            className="sm:col-span-2 rounded-2xl border border-black/5 bg-surface/80 p-4 sm:p-5"
          >
            <ProfileAvatarUpload
              userId={user.id}
              displayName={displayName || profile?.display_name || "User"}
              email={user.email}
              avatarUrl={avatarUrl}
              profileDetails={profile?.details}
              onAvatarUpdated={handleProfileUpdated}
              disabled={saving}
            />
            <ProfileGalleryUpload
              userId={user.id}
              profile={profile}
              avatarUrl={avatarUrl}
              onProfileUpdated={handleProfileUpdated}
              disabled={saving}
            />
            <FormFieldError message={fieldErrors.profile_photo} />
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <RequiredFieldLabel htmlFor="display_name" required>
            {setup.displayName}
          </RequiredFieldLabel>
          <input
            id="display_name"
            name="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={() => setDisplayName((current) => normalizeFullName(current))}
            required
            autoComplete="name"
            className="input-field mt-1"
            placeholder={setup.displayNamePlaceholder}
            {...requiredFieldOrderProps(1)}
          />
          <FormFieldError message={fieldErrors.display_name} />
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
          <ProfileLocationField
            label={setup.location}
            placeholder={setup.locationPlaceholder}
            hintGoogle={setup.locationGoogleHint}
            hintFallback={setup.locationCityHint}
            value={profileLocation}
            onChange={(next) => {
              setProfileLocation(next);
              setLocationFieldError(null);
            }}
            disabled={saving}
            required
            error={fieldErrors.location ?? locationFieldError}
          />
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

        <ProfileLanguagesSelector
          languages={languages}
          languagesOther={languagesOther}
          onLanguagesChange={setLanguages}
          onLanguagesOtherChange={setLanguagesOther}
          required
          error={fieldErrors.languages}
        />

        <div className="sm:col-span-2">
          <RequiredFieldLabel htmlFor="bio" required>
            {setup.bioLabel}
          </RequiredFieldLabel>
          <AutoResizeTextarea
            id="bio"
            name="bio"
            minRows={4}
            value={bio}
            onChange={(e) => handleBioChange(e.target.value)}
            required
            className="input-field mt-1"
            placeholder={bioPlaceholder}
            aria-describedby="bio-word-counter"
          />
          <BioWordCounter id="bio-word-counter" bio={bio} />
          <FormFieldError message={fieldErrors.bio} />
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
            fieldErrors={fieldErrors}
            required
          />
        ) : null}
      </div>

      <Button type="submit" variant="primary" disabled={saving || !bioValid}>
        {saving ? t.common.saving : resolvedSubmitLabel}
      </Button>
    </form>
  );
}
