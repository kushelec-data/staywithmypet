"use client";

import { BioWordCounter } from "@/components/profile/BioWordCounter";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { ProfileLocationField } from "@/components/profile/ProfileLocationField";
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
  getWordCount,
  isBioWordCountValid,
  normalizeBioForSave,
} from "@/lib/bio-words";
import { ProfileLanguagesSelector } from "@/components/profile/ProfileLanguagesSelector";
import { bioPlaceholderForRole } from "@/lib/profile-bio-placeholder";
import {
  languagesOtherFromDetails,
  profileLanguagesOtherMissing,
} from "@/lib/profile-languages";
import { notifyDashboardRefresh } from "@/lib/dashboard-refresh";
import { normalizeFullName } from "@/lib/name-format";
import { useRouter } from "next/navigation";
import { translateProfileLabel } from "@/lib/profile-translations";
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
import { isOtherOptionValue, validateOtherOptionFields } from "@/lib/other-option";
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
import {
  EMPTY_PROFILE_LOCATION_FORM,
  profileLocationDisplayKey,
  profileLocationFromRow,
  profileLocationToSaveInput,
  resolveProfileLocationForSave,
  validateProfileLocationForSave,
  type ProfileLocationFormState,
} from "@/lib/profile-location";
import { createClient } from "@/lib/supabase";
import { FormDraftStatus } from "@/components/forms/FormDraftStatus";
import { useFormDraftStorage } from "@/hooks/useFormDraftStorage";
import {
  buildProfileEditDraftFromProfile,
  emptyProfileEditDraft,
  type ProfileEditDraftData,
} from "@/lib/form-drafts/profile-edit-draft";
import { formDraftStorageKey } from "@/lib/form-draft-storage";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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
    setProfileLocation: (v: ProfileLocationFormState) => void;
    setLanguages: (v: string[]) => void;
    setLanguagesOther: (v: string) => void;
    setBio: (v: string) => void;
    setAvatarUrl: (v: string | null) => void;
  },
) {
  setters.setAvatarUrl(profile.avatar_url?.trim() || null);
  setters.setDisplayName(profile.display_name?.trim() ?? "");
  setters.setProfileLocation(profileLocationFromRow(profile));
  setters.setLanguages([...(profile.languages ?? [])]);
  setters.setLanguagesOther(languagesOtherFromDetails(profile.details));
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
  const { t, locale } = useLanguage();
  const pe = t.profileEdit;
  const { profile, loading: profileLoading, refreshProfile, setProfileRow } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const dashboardRedirectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bioUserEditedRef = useRef(false);
  const originalLocationKeyRef = useRef("");
  const originalLocationSnapshotRef = useRef<ProfileLocationFormState>(EMPTY_PROFILE_LOCATION_FORM);
  const formInitializedRef = useRef(false);
  const [openAvailabilityPanel, setOpenAvailabilityPanel] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [profileLocation, setProfileLocation] = useState<ProfileLocationFormState>(
    EMPTY_PROFILE_LOCATION_FORM,
  );
  const [locationFieldError, setLocationFieldError] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [languagesOther, setLanguagesOther] = useState("");
  const [bio, setBio] = useState("");
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

  const bioPlaceholder = useMemo(
    () => bioPlaceholderForRole(role, pe.basic.bioPlaceholders),
    [role, pe.basic.bioPlaceholders],
  );

  const draftKey = useMemo(
    () => (user?.id ? formDraftStorageKey(["profile-edit", user.id]) : ""),
    [user?.id],
  );

  const draftData = useMemo(
    (): ProfileEditDraftData => ({
      displayName,
      profileLocation,
      languages,
      languagesOther,
      bio,
      trustSafety,
      petFriendForm,
      petParentForm,
      activeStepIndex,
    }),
    [
      displayName,
      profileLocation,
      languages,
      languagesOther,
      bio,
      trustSafety,
      petFriendForm,
      petParentForm,
      activeStepIndex,
    ],
  );

  const applyProfileEditDraft = useCallback((draft: ProfileEditDraftData) => {
    bioUserEditedRef.current = Boolean(draft.bio.trim());
    originalLocationKeyRef.current = profileLocationDisplayKey(draft.profileLocation);
    originalLocationSnapshotRef.current = draft.profileLocation;
    setDisplayName(draft.displayName);
    setProfileLocation(draft.profileLocation);
    setLanguages([...draft.languages]);
    setLanguagesOther(draft.languagesOther);
    setBio(draft.bio);
    setTrustSafety(draft.trustSafety);
    setPetFriendForm(draft.petFriendForm);
    setPetParentForm(draft.petParentForm);
    if (typeof draft.activeStepIndex === "number") {
      setActiveStepIndex(Math.max(0, draft.activeStepIndex));
    }
  }, []);

  const { draftStatus, clearDraft, markHydratedFromServer } = useFormDraftStorage({
    key: draftKey,
    data: draftData,
    enabled: Boolean(user?.id && draftKey && !profileLoading),
    onRestore: applyProfileEditDraft,
  });

  const bioWordCount = useMemo(() => getWordCount(bio), [bio]);
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

  function logBio(message: string, detail?: Record<string, unknown>): void {
    if (detail) {
      console.info(`[bio] ${message}`, detail);
    } else {
      console.info(`[bio] ${message}`);
    }
  }

  function handleBioChange(next: string) {
    bioUserEditedRef.current = true;
    const count = getWordCount(next);
    const valid = isBioWordCountValid(count);
    const status = bioWordStatus(count);
    logBio("current value", { length: next.length, text: next });
    logBio("word count", { count });
    logBio("validation result", { valid, status });
    setBio(next);
  }

  useEffect(() => {
    if (profileLoading || formInitializedRef.current) return;

    if (profile) {
      formInitializedRef.current = true;
      const baseline = buildProfileEditDraftFromProfile(profile, 0);
      const restored = markHydratedFromServer(baseline);
      if (!restored) {
        const loadedLocation = profileLocationFromRow(profile);
        originalLocationKeyRef.current = profileLocationDisplayKey(loadedLocation);
        originalLocationSnapshotRef.current = loadedLocation;
        applyBasicFromProfile(profile, {
          setDisplayName,
          setProfileLocation,
          setLanguages,
          setLanguagesOther,
          setBio: (value) => {
            if (!bioUserEditedRef.current) {
              setBio(value);
            }
          },
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
      }

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
      formInitializedRef.current = true;
      const restored = markHydratedFromServer(emptyProfileEditDraft());
      if (!restored) {
        setDisplayName(resolveProfileDisplayName(user, null));
      }
    }
  }, [profile, profileLoading, user, markHydratedFromServer]);

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
    if (section === "basic") {
      setLocationFieldError(null);
    }
    if (dashboardRedirectRef.current) {
      clearTimeout(dashboardRedirectRef.current);
      dashboardRedirectRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (dashboardRedirectRef.current) clearTimeout(dashboardRedirectRef.current);
    };
  }, []);

  async function afterSectionSave(section: ProfileEditSectionKey, saved: ProfileRow) {
    setProfileRow(saved);
    if (section === "basic") {
      bioUserEditedRef.current = false;
      const savedLocation = profileLocationFromRow(saved);
      originalLocationKeyRef.current = profileLocationDisplayKey(savedLocation);
      originalLocationSnapshotRef.current = savedLocation;
    }
    applyBasicFromProfile(saved, {
      setDisplayName,
      setProfileLocation,
      setLanguages,
      setLanguagesOther,
      setBio,
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
    const isFinalStep = visibleSteps[visibleSteps.length - 1] === section;
    setSuccess((prev) => ({
      ...prev,
      [section]: isFinalStep ? pe.wizard.finalStepSavedRedirect : pe.sectionSaved,
    }));
    setErrors((prev) => ({ ...prev, [section]: null }));
    clearDraft();
    if (isFinalStep) {
      if (dashboardRedirectRef.current) clearTimeout(dashboardRedirectRef.current);
      dashboardRedirectRef.current = setTimeout(() => {
        dashboardRedirectRef.current = null;
        router.push("/dashboard");
      }, 2000);
    }
  }

  async function handleSaveBasic() {
    if (!user) return;
    const trimmedName = normalizeFullName(displayName);
    setDisplayName(trimmedName);
    if (!trimmedName) {
      setErrors((prev) => ({ ...prev, basic: pe.basic.errorDisplayName }));
      return;
    }
    const locationValidation = validateProfileLocationForSave(profileLocation, {
      originalDisplayKey: originalLocationKeyRef.current,
    });
    if (!locationValidation.ok) {
      const message =
        locationValidation.error === "placeRequired"
          ? pe.basic.errorLocationPlaceRequired
          : pe.basic.errorLocation;
      setLocationFieldError(message);
      setErrors((prev) => ({ ...prev, basic: message }));
      return;
    }
    setLocationFieldError(null);
    if (languages.length === 0) {
      setErrors((prev) => ({ ...prev, basic: pe.basic.errorLanguages }));
      return;
    }
    if (profileLanguagesOtherMissing(languages, languagesOther)) {
      setErrors((prev) => ({ ...prev, basic: pe.basic.errorLanguageOther }));
      return;
    }
    if (!bioValid) {
      logBio("validation result", {
        valid: false,
        wordCount: bioWordCount,
        status: bioStatus,
        reason: bioWordCount < BIO_WORD_MIN ? "too_few" : "too_many",
      });
      setErrors((prev) => ({
        ...prev,
        basic:
          bioWordCount < BIO_WORD_MIN
            ? pe.basic.errorBioMin
            : pe.basic.errorBioMax.replace("{max}", String(BIO_WORD_MAX)),
      }));
      return;
    }

    const bioPayload = normalizeBioForSave(bio);
    logBio("save payload", { bio: bioPayload, wordCount: bioWordCount });

    const locationForSave = resolveProfileLocationForSave(
      profileLocation,
      originalLocationSnapshotRef.current,
    );

    setSaving((prev) => ({ ...prev, basic: true }));
    setErrors((prev) => ({ ...prev, basic: null }));
    setSuccess((prev) => ({ ...prev, basic: null }));
    try {
      const saved = await saveBasicProfileSection(
        supabase,
        user.id,
        {
          displayName: trimmedName,
          location: profileLocationToSaveInput(locationForSave),
          languages: [...languages],
          languagesOther,
          bio: bioPayload,
        },
        {
          user,
          existingDisplayName: profile?.display_name ?? trimmedName,
          preserveRole: profile?.role_chosen_at ? profile.role : undefined,
        },
      );
      logBio("save result", { ok: true, bio: saved.bio, wordCount: getWordCount(saved.bio ?? "") });
      await afterSectionSave("basic", saved);
    } catch (err) {
      logBio("save result", {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      });
      const message = err instanceof Error ? err.message : t.profileEdit.saveProfileError;
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
      const { profile: saved, phoneNewlyVerified } = await saveTrustSafetyProfileSection(
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
      if (phoneNewlyVerified) {
        try {
          const { sendPhoneVerifiedEmailAction } = await import("@/app/actions/email-events");
          await sendPhoneVerifiedEmailAction();
        } catch (emailErr) {
          console.error("[email-event] phone verified action failed", emailErr);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t.profileEdit.saveTrustSafetyError;
      setErrors((prev) => ({ ...prev, trust: message }));
    } finally {
      setSaving((prev) => ({ ...prev, trust: false }));
    }
  }

  async function handleSavePetFriend(saveAsSection: "petFriend" | "availability" = "petFriend") {
    if (!user) return;

    const otherError = validateOtherOptionFields([
      { selected: petFriendForm.petTypesWilling, otherText: petFriendForm.petTypesWillingOther, fieldLabel: "pet type" },
      { selected: petFriendForm.availableCareTypes, otherText: petFriendForm.availableCareTypesOther, fieldLabel: "care type" },
      {
        selected: petFriendForm.petTypesPreviouslyBorrowed,
        otherText: petFriendForm.petTypesPreviouslyBorrowedOther,
        fieldLabel: "pet type",
      },
      ...(isOtherOptionValue(petFriendForm.livingType)
        ? [{ selected: ["other"], otherText: petFriendForm.livingTypeOther, fieldLabel: "living type" }]
        : []),
    ]);
    if (otherError) {
      setErrors((prev) => ({ ...prev, [saveAsSection]: otherError }));
      return;
    }

    setSaving((prev) => ({ ...prev, [saveAsSection]: true }));
    setErrors((prev) => ({ ...prev, [saveAsSection]: null }));
    setSuccess((prev) => ({ ...prev, [saveAsSection]: null }));
    try {
      const saved = await savePetFriendProfileSection(supabase, user.id, petFriendForm, {
        user,
        existingDisplayName: profile?.display_name,
      });
      await afterSectionSave(saveAsSection, saved);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.profileEdit.saveFriendProfileError;
      setErrors((prev) => ({ ...prev, [saveAsSection]: message }));
    } finally {
      setSaving((prev) => ({ ...prev, [saveAsSection]: false }));
    }
  }

  async function handleSavePetParent() {
    if (!user) return;

    const otherError = validateOtherOptionFields([
      { selected: petParentForm.preferredPetTypes, otherText: petParentForm.preferredPetTypesOther, fieldLabel: "pet type" },
      { selected: petParentForm.preferredCareTypes, otherText: petParentForm.preferredCareTypesOther, fieldLabel: "care type" },
    ]);
    if (otherError) {
      setErrors((prev) => ({ ...prev, petParent: otherError }));
      return;
    }

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
      const message = err instanceof Error ? err.message : t.profileEdit.saveParentProfileError;
      setErrors((prev) => ({ ...prev, petParent: message }));
    } finally {
      setSaving((prev) => ({ ...prev, petParent: false }));
    }
  }

  if (profileLoading) {
    return <p className="text-sm text-muted">{t.account.profileSetup.loadingProfile}</p>;
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
      onSave: () => void handleSavePetFriend("petFriend"),
    },
    availability: {
      title: pe.availability.title,
      description: pe.availability.description,
      onSave: () => void handleSavePetFriend("availability"),
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
                profileDetails={profile?.details}
                onAvatarUpdated={handleAvatarUpdated}
                editable={basicEnabled}
                disabled={saving.basic}
              />
              <ProfileGalleryUpload
                userId={user.id}
                profile={profile}
                avatarUrl={avatarUrl}
                onProfileUpdated={handleProfileGalleryUpdated}
                editable={basicEnabled}
                disabled={saving.basic}
              />
            </div>
          ) : null}

          {profile?.role_chosen_at ? <ProfileRoleStatusCard profile={profile} /> : null}

          <div>
            <label htmlFor="display_name" className="form-field-label">
              {pe.basic.displayName}
            </label>
            <input
              id="display_name"
              name="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => setDisplayName((current) => normalizeFullName(current))}
              required
              autoComplete="name"
              disabled={!basicEnabled || saving.basic || anySaving}
              className="input-field mt-1"
              placeholder={pe.basic.displayNamePlaceholder}
            />
          </div>

          <ProfileLocationField
            label={pe.basic.location}
            placeholder={pe.basic.locationPlaceholder}
            hintGoogle={pe.basic.locationHintGoogle}
            hintFallback={pe.basic.locationHintList}
            value={profileLocation}
            onChange={(next) => {
              setProfileLocation(next);
              setLocationFieldError(null);
            }}
            disabled={!basicEnabled || saving.basic || anySaving}
            required
            error={locationFieldError}
          />

          <ProfileLanguagesSelector
            languages={languages}
            languagesOther={languagesOther}
            onLanguagesChange={setLanguages}
            onLanguagesOtherChange={setLanguagesOther}
            disabled={!basicEnabled || saving.basic || anySaving}
            label={pe.basic.languages}
            otherPlaceholder={pe.basic.languageOtherPlaceholder}
            otherInputId="profile_edit_languages_other"
          />

          <div>
            <label htmlFor="bio" className="form-field-label">
              {pe.basic.bio}
            </label>
            <AutoResizeTextarea
              id="bio"
              name="bio"
              minRows={4}
              value={bio}
              onChange={(e) => handleBioChange(e.target.value)}
              required
              disabled={!basicEnabled || saving.basic || anySaving}
              className="input-field mt-1"
              placeholder={bioPlaceholder}
              aria-describedby="bio-word-counter"
            />
            <BioWordCounter id="bio-word-counter" bio={bio} />
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
    <>
      <FormDraftStatus status={draftStatus} className="mb-3" />
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
        editingModeEnabled: pe.wizard.editingModeEnabled,
        editingModeHint: pe.wizard.editingModeHint,
      }}
    />
    </>
  );
}
