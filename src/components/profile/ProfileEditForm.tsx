"use client";

import { BioWordCounter } from "@/components/profile/BioWordCounter";
import { GooglePlacesInput } from "@/components/location/GooglePlacesInput";
import { PetFriendProfileFormSections } from "@/components/profile/PetFriendProfileFormSections";
import { PetParentProfileFormSection } from "@/components/profile/PetParentProfileFormSection";
import { ProfileAvatarUpload } from "@/components/profile/ProfileAvatarUpload";
import {
  ProfileEditWizard,
  type ProfileEditWizardStep,
} from "@/components/profile/ProfileEditWizard";
import { ProfileGalleryUpload } from "@/components/profile/ProfileGalleryUpload";
import { ProfileRoleStatusCard } from "@/components/profile/ProfileRoleStatusCard";
import {
  TrustSafetyFormSection,
  emptyTrustSafetyFormValues,
  type TrustSafetyFormValues,
} from "@/components/profile/TrustSafetyFormSection";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useProfile } from "@/context/ProfileContext";
import { availabilityUxForProfile } from "@/lib/availability-ux";
import {
  BIO_WORD_MAX,
  BIO_WORD_MIN,
  bioWordStatus,
  countBioWords,
  isBioWordCountValid,
  normalizeBioForSave,
  truncateBioToMaxWords,
} from "@/lib/bio-words";
import { notifyDashboardRefresh } from "@/lib/dashboard-refresh";
import {
  finalizeLocationText,
  locationInputDisplayValue,
  shortLocationLabel,
} from "@/lib/google-places-parse";
import { getGoogleMapsApiKey } from "@/lib/google-places-loader";
import { PROFILE_LOCATION_CITY_OPTIONS, PROFILE_LOCATION_DATALIST_ID } from "@/lib/location-datalist";
import { languageOptions } from "@/lib/legacy/search-filters";
import { resolveProfileDisplayName } from "@/lib/profile-display-name";
import {
  isBasicProfileSectionComplete,
  isAvailabilitySectionComplete,
  isPetFriendSectionComplete,
  isPetParentSectionComplete,
  isProfileEditSectionComplete,
  isTrustSafetySectionComplete,
  profileEditStepFromHash,
  visibleProfileEditSteps,
  type ProfileEditSectionKey,
} from "@/lib/profile-edit-sections";
import {
  emptyPetFriendProfileForm,
  petFriendFormFromDetailsRaw,
  type PetFriendProfileFormInput,
} from "@/lib/profile-friend-form";
import { resolveActiveMode } from "@/lib/profile-mode";
import {
  emptyPetParentProfileForm,
  petParentFormFromDetailsRaw,
  type PetParentProfileFormInput,
} from "@/lib/profile-parent-form";
import type { ProfileRole } from "@/lib/profile-setup";
import {
  saveBasicProfileSection,
  savePetFriendProfileSection,
  savePetParentProfileSection,
  saveTrustSafetyProfileSection,
} from "@/lib/profile-setup";
import type { ProfileRow } from "@/lib/profile-utils";
import { normalizeAvailabilityDates } from "@/lib/pet-availability";
import {
  DEFAULT_PHONE_DIAL_CODE,
  parseDialCodeFromE164,
} from "@/lib/phone-eu";
import { parseEmergencyContactFromProfile } from "@/lib/trust-safety";
import { createClient } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

function profileEditStepFromQuery(step: string | null): ProfileEditSectionKey | null {
  const value = (step ?? "").trim().toLowerCase();
  if (!value) return null;
  if (value === "availability") return "availability";
  if (value === "petfriend") return "petFriend";
  if (value === "petparent") return "petParent";
  if (value === "basic") return "basic";
  if (value === "trust") return "trust";
  return null;
}

function applyBasicFromProfile(
  profile: ProfileRow,
  setters: {
    setDisplayName: (v: string) => void;
    setLocation: (v: string) => void;
    setAddress: (v: string) => void;
    setLatitude: (v: number | null) => void;
    setLongitude: (v: number | null) => void;
    setLanguages: (v: string[]) => void;
    setBio: (v: string) => void;
    setGooglePlaceId: (v: string | null) => void;
    setAvatarUrl: (v: string | null) => void;
  },
) {
  setters.setAvatarUrl(profile.avatar_url?.trim() || null);
  setters.setDisplayName(profile.display_name?.trim() ?? "");
  setters.setLocation(profile.location?.trim() ?? "");
  setters.setAddress(profile.address?.trim() ?? "");
  const rawDetails = profile.details as Record<string, unknown> | undefined;
  const pid = rawDetails?.google_place_id;
  setters.setGooglePlaceId(typeof pid === "string" && pid.trim() ? pid.trim() : null);
  setters.setLatitude(profile.latitude ?? null);
  setters.setLongitude(profile.longitude ?? null);
  setters.setLanguages([...(profile.languages ?? [])]);
  setters.setBio(profile.bio?.trim() ?? "");
}

function applyTrustFromProfile(
  profile: ProfileRow,
  setTrustSafety: (v: TrustSafetyFormValues) => void,
) {
  const emergency = parseEmergencyContactFromProfile(profile);
  const mainE164 = profile.phone_e164?.trim() || profile.phone?.trim() || "";
  const mainParts = parseDialCodeFromE164(mainE164 || null);
  const ecParts = parseDialCodeFromE164(emergency?.phone ?? null);
  setTrustSafety({
    phoneDialCode: profile.phone_country_code?.trim() || mainParts.dialCode,
    phoneNational: profile.phone_number?.trim() || mainParts.nationalDigits,
    emergencyName: emergency?.name ?? "",
    emergencyDialCode: profile.emergency_contact_phone_country_code?.trim() || ecParts.dialCode,
    emergencyNational: profile.emergency_contact_phone_number?.trim() || ecParts.nationalDigits,
    emergencyRelationship:
      emergency?.relationship ?? profile.details?.emergency_contact_relationship ?? "",
  });
}

export function ProfileEditForm() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const pe = t.profileEdit;
  const { profile, loading: profileLoading, refreshProfile, setProfileRow } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const [openAvailabilityPanel, setOpenAvailabilityPanel] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [trustSafety, setTrustSafety] = useState<TrustSafetyFormValues>(emptyTrustSafetyFormValues);
  const [petFriendForm, setPetFriendForm] = useState<PetFriendProfileFormInput>(
    emptyPetFriendProfileForm,
  );
  const [petParentForm, setPetParentForm] = useState<PetParentProfileFormInput>(
    emptyPetParentProfileForm,
  );

  const [editing, setEditing] = useState<Record<ProfileEditSectionKey, boolean>>({
    basic: true,
    trust: true,
    petFriend: true,
    availability: true,
    petParent: true,
  });
  const [saving, setSaving] = useState<Record<ProfileEditSectionKey, boolean>>({
    basic: false,
    trust: false,
    petFriend: false,
    availability: false,
    petParent: false,
  });
  const [errors, setErrors] = useState<Partial<Record<ProfileEditSectionKey, string | null>>>({});
  const [success, setSuccess] = useState<Partial<Record<ProfileEditSectionKey, string | null>>>({});
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const role: ProfileRole = profile?.role ?? "pet_friend";
  const activeMode = resolveActiveMode(role, profile?.active_mode);
  const visibleSteps = useMemo(() => visibleProfileEditSteps(role, activeMode), [role, activeMode]);
  const activeStepId = visibleSteps[activeStepIndex] ?? visibleSteps[0];
  const availabilityUx = availabilityUxForProfile(role, activeMode);

  const locationFieldValue = locationInputDisplayValue(address, location);
  const bioWordCount = useMemo(() => countBioWords(bio), [bio]);
  const bioStatus = bioWordStatus(bioWordCount);
  const bioValid = isBioWordCountValid(bioWordCount);

  const sectionComplete = useCallback(
    (section: ProfileEditSectionKey) => {
      if (section === "basic") {
        return isBasicProfileSectionComplete(profile, bioValid);
      }
      if (section === "trust") return isTrustSafetySectionComplete(profile);
      if (section === "petFriend") return isPetFriendSectionComplete(profile);
      if (section === "availability") return isAvailabilitySectionComplete(profile);
      return isPetParentSectionComplete(profile);
    },
    [profile, bioValid],
  );

  const isStepFieldsEnabled = useCallback(
    (section: ProfileEditSectionKey) => editing[section] && activeStepId === section,
    [editing, activeStepId],
  );

  function handleBioChange(next: string) {
    const count = countBioWords(next);
    setBio(count > BIO_WORD_MAX ? truncateBioToMaxWords(next) : next);
  }

  function toggleLanguage(lang: string) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  }

  useEffect(() => {
    if (profileLoading) return;

    if (profile) {
      applyBasicFromProfile(profile, {
        setDisplayName,
        setLocation,
        setAddress,
        setLatitude,
        setLongitude,
        setLanguages,
        setBio,
        setGooglePlaceId,
        setAvatarUrl,
      });
      applyTrustFromProfile(profile, setTrustSafety);
      setPetFriendForm(
        petFriendFormFromDetailsRaw(
          profile.details,
          normalizeAvailabilityDates(
            profile.details?.availability_schedule?.selected_dates ?? [],
          ),
        ),
      );
      setPetParentForm(petParentFormFromDetailsRaw(profile.details));

      const steps = visibleProfileEditSteps(
        profile.role ?? "pet_friend",
        resolveActiveMode(profile.role ?? "pet_friend", profile.active_mode),
      );
      setEditing({
        basic: !isProfileEditSectionComplete("basic", profile),
        trust: !isProfileEditSectionComplete("trust", profile),
        petFriend: steps.includes("petFriend")
          ? !isProfileEditSectionComplete("petFriend", profile)
          : false,
        availability: steps.includes("availability")
          ? !isProfileEditSectionComplete("availability", profile)
          : false,
        petParent: steps.includes("petParent")
          ? !isProfileEditSectionComplete("petParent", profile)
          : false,
      });
      return;
    }

    if (user) {
      setDisplayName(resolveProfileDisplayName(user, null));
    }
  }, [profile, profileLoading, user]);

  useEffect(() => {
    const hashStep = profileEditStepFromHash(window.location.hash);
    if (!hashStep) return;
    const index = visibleSteps.indexOf(hashStep);
    if (index >= 0) setActiveStepIndex(index);
  }, [visibleSteps]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("step") ?? params.get("section");
    const stepFromQuery = profileEditStepFromQuery(raw);
    if (!stepFromQuery) return;
    const index = visibleSteps.indexOf(stepFromQuery);
    if (index < 0) return;
    setActiveStepIndex(index);

    if ((raw ?? "").trim().toLowerCase() === "availability") {
      setOpenAvailabilityPanel(true);
      window.requestAnimationFrame(() => {
        document.getElementById("availability")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [visibleSteps]);

  useEffect(() => {
    if (activeStepIndex >= visibleSteps.length) {
      setActiveStepIndex(Math.max(0, visibleSteps.length - 1));
    }
  }, [activeStepIndex, visibleSteps.length]);

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

  function startEdit(section: ProfileEditSectionKey) {
    setEditing((prev) => ({ ...prev, [section]: true }));
    setErrors((prev) => ({ ...prev, [section]: null }));
    setSuccess((prev) => ({ ...prev, [section]: null }));
  }

  async function afterSectionSave(section: ProfileEditSectionKey, saved: ProfileRow) {
    setProfileRow(saved);
    applyBasicFromProfile(saved, {
      setDisplayName,
      setLocation,
      setAddress,
      setLatitude,
      setLongitude,
      setLanguages,
      setBio,
      setGooglePlaceId,
      setAvatarUrl,
    });
    applyTrustFromProfile(saved, setTrustSafety);
    setPetFriendForm(
      petFriendFormFromDetailsRaw(
        saved.details,
        normalizeAvailabilityDates(saved.details?.availability_schedule?.selected_dates ?? []),
      ),
    );
    setPetParentForm(petParentFormFromDetailsRaw(saved.details));
    await refreshProfile();
    notifyDashboardRefresh();
    setEditing((prev) => ({ ...prev, [section]: false }));
    setSuccess((prev) => ({ ...prev, [section]: pe.sectionSaved }));
    setErrors((prev) => ({ ...prev, [section]: null }));
  }

  async function handleSaveBasic() {
    if (!user) return;
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setErrors((prev) => ({ ...prev, basic: pe.basic.errorDisplayName }));
      return;
    }
    const locationText = finalizeLocationText(locationFieldValue);
    if (!locationText) {
      setErrors((prev) => ({ ...prev, basic: pe.basic.errorLocation }));
      return;
    }
    if (languages.length === 0) {
      setErrors((prev) => ({ ...prev, basic: pe.basic.errorLanguages }));
      return;
    }
    if (!bioValid) {
      setErrors((prev) => ({
        ...prev,
        basic:
          bioWordCount < BIO_WORD_MIN
            ? pe.basic.errorBioMin
            : pe.basic.errorBioMax.replace("{max}", String(BIO_WORD_MAX)),
      }));
      return;
    }

    const hasGoogleCoords = latitude != null && longitude != null;

    setSaving((prev) => ({ ...prev, basic: true }));
    setErrors((prev) => ({ ...prev, basic: null }));
    setSuccess((prev) => ({ ...prev, basic: null }));
    try {
      const saved = await saveBasicProfileSection(
        supabase,
        user.id,
        {
          displayName: trimmedName,
          location: hasGoogleCoords ? finalizeLocationText(location) || locationText : locationText,
          languages: [...languages],
          bio: normalizeBioForSave(bio),
          address: hasGoogleCoords ? finalizeLocationText(address) || locationText : locationText,
          latitude,
          longitude,
          googlePlaceId: hasGoogleCoords ? googlePlaceId : null,
        },
        {
          user,
          existingDisplayName: profile?.display_name ?? trimmedName,
          preserveRole: profile?.role_chosen_at ? profile.role : undefined,
        },
      );
      await afterSectionSave("basic", saved);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save your profile.";
      setErrors((prev) => ({ ...prev, basic: message }));
    } finally {
      setSaving((prev) => ({ ...prev, basic: false }));
    }
  }

  async function handleSaveTrust() {
    if (!user) return;

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

    setSaving((prev) => ({ ...prev, trust: true }));
    setErrors((prev) => ({ ...prev, trust: null }));
    setSuccess((prev) => ({ ...prev, trust: null }));
    try {
      const saved = await saveTrustSafetyProfileSection(
        supabase,
        user.id,
        {
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
        },
        { user, existingDisplayName: profile?.display_name },
      );
      await afterSectionSave("trust", saved);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save trust & safety.";
      setErrors((prev) => ({ ...prev, trust: message }));
    } finally {
      setSaving((prev) => ({ ...prev, trust: false }));
    }
  }

  async function handleSavePetFriend() {
    if (!user) return;

    setSaving((prev) => ({ ...prev, petFriend: true }));
    setErrors((prev) => ({ ...prev, petFriend: null }));
    setSuccess((prev) => ({ ...prev, petFriend: null }));
    try {
      const saved = await savePetFriendProfileSection(supabase, user.id, petFriendForm, {
        user,
        existingDisplayName: profile?.display_name,
      });
      await afterSectionSave("petFriend", saved);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save Pet Friend profile.";
      setErrors((prev) => ({ ...prev, petFriend: message }));
    } finally {
      setSaving((prev) => ({ ...prev, petFriend: false }));
    }
  }

  async function handleSavePetParent() {
    if (!user) return;

    setSaving((prev) => ({ ...prev, petParent: true }));
    setErrors((prev) => ({ ...prev, petParent: null }));
    setSuccess((prev) => ({ ...prev, petParent: null }));
    try {
      const saved = await savePetParentProfileSection(supabase, user.id, petParentForm, {
        user,
        existingDisplayName: profile?.display_name,
      });
      await afterSectionSave("petParent", saved);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save Pet Parent profile.";
      setErrors((prev) => ({ ...prev, petParent: message }));
    } finally {
      setSaving((prev) => ({ ...prev, petParent: false }));
    }
  }

  if (profileLoading) {
    return <p className="text-sm text-muted">Loading profile…</p>;
  }

  const anySaving = Object.values(saving).some(Boolean);
  const basicEnabled = isStepFieldsEnabled("basic");
  const trustEnabled = isStepFieldsEnabled("trust");
  const petFriendEnabled = isStepFieldsEnabled("petFriend");
  const availabilityEnabled = isStepFieldsEnabled("availability");
  const petParentEnabled = isStepFieldsEnabled("petParent");

  const stepMeta: Record<
    ProfileEditSectionKey,
    { title: string; description: string; onSave: () => void }
  > = {
    basic: {
      title: pe.basic.title,
      description: pe.basic.description,
      onSave: () => void handleSaveBasic(),
    },
    trust: {
      title: pe.trust.title,
      description: pe.trust.description,
      onSave: () => void handleSaveTrust(),
    },
    petFriend: {
      title: pe.petFriend.title,
      description: pe.petFriend.description,
      onSave: () => void handleSavePetFriend(),
    },
    availability: {
      title: pe.availability.title,
      description: pe.availability.description,
      onSave: () => void handleSavePetFriend(),
    },
    petParent: {
      title: pe.petParent.title,
      description: pe.petParent.description,
      onSave: () => void handleSavePetParent(),
    },
  };

  const wizardSteps: ProfileEditWizardStep[] = visibleSteps.map((stepId) => {
    const meta = stepMeta[stepId];
    const complete = sectionComplete(stepId);
    let content: ReactNode = null;

    if (stepId === "basic") {
      content = (
        <>
          {user ? (
            <div className="rounded-2xl border border-black/5 bg-surface/80 p-4 sm:p-5">
              <ProfileAvatarUpload
                userId={user.id}
                displayName={displayName || profile?.display_name || "User"}
                email={user.email}
                avatarUrl={avatarUrl}
                onAvatarUpdated={handleAvatarUpdated}
                disabled={!basicEnabled || saving.basic}
              />
              <ProfileGalleryUpload
                userId={user.id}
                profile={profile}
                avatarUrl={avatarUrl}
                onProfileUpdated={handleProfileGalleryUpdated}
                disabled={!basicEnabled || saving.basic}
              />
            </div>
          ) : null}

          {profile?.role_chosen_at ? <ProfileRoleStatusCard profile={profile} /> : null}

          <div>
            <label htmlFor="display_name" className="text-sm font-medium text-foreground">
              {pe.basic.displayName}
            </label>
            <input
              id="display_name"
              name="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
              disabled={!basicEnabled || saving.basic || anySaving}
              className="input-field mt-1"
              placeholder={pe.basic.displayNamePlaceholder}
            />
          </div>

          <div>
            <label htmlFor="location" className="text-sm font-medium text-foreground">
              {pe.basic.location}
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
              disabled={!basicEnabled || saving.basic || anySaving}
              className="input-field mt-1"
              placeholder={pe.basic.locationPlaceholder}
              datalistId={PROFILE_LOCATION_DATALIST_ID}
            />
            <datalist id={PROFILE_LOCATION_DATALIST_ID}>
              {PROFILE_LOCATION_CITY_OPTIONS.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-muted">
              {getGoogleMapsApiKey() ? pe.basic.locationHintGoogle : pe.basic.locationHintList}
            </p>
          </div>

          <div>
            <span className="text-sm font-medium text-foreground">{pe.basic.languages}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {languageOptions.map((lang) => {
                const selected = languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    disabled={!basicEnabled || saving.basic || anySaving}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? "border-[#2E6B3F] bg-[#2E6B3F] text-white"
                        : "border-[#E5E2D8] bg-[#F8F6F1] text-muted hover:bg-[#DDEEDF] hover:text-[#2E6B3F]"
                    }`}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="text-sm font-medium text-foreground">
              {pe.basic.bio}
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              value={bio}
              onChange={(e) => handleBioChange(e.target.value)}
              required
              disabled={!basicEnabled || saving.basic || anySaving}
              className="input-field mt-1 resize-y"
              placeholder={pe.basic.bioPlaceholder}
              aria-describedby="bio-word-counter"
            />
            <BioWordCounter id="bio-word-counter" wordCount={bioWordCount} status={bioStatus} />
          </div>
        </>
      );
    } else if (stepId === "trust") {
      content = (
        <TrustSafetyFormSection
          values={trustSafety}
          emailVerified={Boolean(user?.email_confirmed_at)}
          phoneVerified={Boolean(profile?.phone_verified)}
          onChange={setTrustSafety}
          disabled={!trustEnabled || saving.trust || anySaving}
          embedded
        />
      );
    } else if (stepId === "petFriend") {
      content = (
        <PetFriendProfileFormSections
          form={petFriendForm}
          onChange={setPetFriendForm}
          disabled={!petFriendEnabled || saving.petFriend || anySaving}
          showCalendar={availabilityUx.showPersonalAvailabilityEditor}
          petFriendId={user?.id ?? null}
          availabilityDefaultOpen={openAvailabilityPanel}
        />
      );
    } else if (stepId === "availability") {
      content = (
        <PetFriendProfileFormSections
          form={petFriendForm}
          onChange={setPetFriendForm}
          disabled={!availabilityEnabled || saving.availability || anySaving}
          showCalendar={availabilityUx.showPersonalAvailabilityEditor}
          petFriendId={user?.id ?? null}
          availabilityDefaultOpen
          onlyAvailabilitySection
        />
      );
    } else {
      content = (
        <PetParentProfileFormSection
          form={petParentForm}
          onChange={setPetParentForm}
          disabled={!petParentEnabled || saving.petParent || anySaving}
          labels={{
            ownPetsSummary: pe.petParent.ownPetsSummary,
            ownPetsSummaryPlaceholder: pe.petParent.ownPetsSummaryPlaceholder,
            careNeeds: pe.petParent.careNeeds,
            careNeedsPlaceholder: pe.petParent.careNeedsPlaceholder,
            homeLocationNotes: pe.petParent.homeLocationNotes,
            homeLocationNotesPlaceholder: pe.petParent.homeLocationNotesPlaceholder,
            preferredPetTypes: pe.petParent.preferredPetTypes,
            preferredCareTypes: pe.petParent.preferredCareTypes,
            petsLinkHint: pe.petParent.petsLinkHint,
            petsLinkLabel: pe.petParent.petsLinkLabel,
          }}
        />
      );
    }

    return {
      id: stepId,
      title: meta.title,
      description: meta.description,
      complete,
      content,
      isEditing: isStepFieldsEnabled(stepId),
      saving: saving[stepId],
      error: errors[stepId] ?? null,
      success: success[stepId] ?? null,
      onEdit: () => startEdit(stepId),
      onSave: meta.onSave,
    };
  });

  return (
    <ProfileEditWizard
      steps={wizardSteps}
      activeIndex={activeStepIndex}
      onActiveIndexChange={setActiveStepIndex}
      labels={{
        stepNumber: pe.wizard.stepNumber,
        statusCompleted: pe.wizard.statusCompleted,
        statusIncomplete: pe.wizard.statusIncomplete,
        previous: pe.wizard.previous,
        nextStep: pe.wizard.nextStep,
        edit: pe.edit,
        saveChanges: pe.saveChanges,
        saving: pe.saving,
        tabsLabel: pe.wizard.tabsLabel,
      }}
    />
  );
}
