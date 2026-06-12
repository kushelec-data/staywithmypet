"use client";

import { Button } from "@/components/ui/Button";
import { PetFormChipGroup, PetFormSection } from "@/components/pets/PetFormSection";
import { AvailabilityCalendar } from "@/components/calendar/AvailabilityCalendar";
import { PetPhotoUpload, type ExistingPetPhotoItem } from "@/components/pets/PetPhotoUpload";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import {
  createPetWithPhotos,
  fetchPetForOwner,
  toDbSpecies,
  updatePetProfile,
  type PetProfileFormInput,
} from "@/lib/pet-data";
import { mapPetRecordToFormInput } from "@/lib/pet-form-mapper";
import { GooglePlacesInput } from "@/components/location/GooglePlacesInput";
import {
  finalizeLocationText,
  locationInputDisplayValue,
  shortLocationLabel,
} from "@/lib/google-places-parse";
import { getGoogleMapsApiKey } from "@/lib/google-places-loader";
import { PROFILE_LOCATION_CITY_OPTIONS, PET_LOCATION_DATALIST_ID } from "@/lib/location-datalist";
import {
  petAnimalTypes,
  petCareLocationOptions,
  petCareTypeOptions,
  petEnergyOptions,
  petFriendRequirementOptions,
  petGenderOptions,
  petSizeOptions,
  petTemperamentOptions,
  petWalkNeedsOptions,
} from "@/lib/pet-form-options";
import { validatePetPhotoFiles } from "@/lib/pet-photos";
import {
  fetchPetPhotosForOwner,
  replacePetPhotoImage,
  uploadAndAttachPetPhotos,
} from "@/lib/pet-photos";
import { notifyDashboardRefresh } from "@/lib/dashboard-refresh";
import { OTHER_FIELD_COPY, validateOtherOptionFields } from "@/lib/other-option";
import { OtherOptionTextInput } from "@/components/profile/form/ProfileFormFields";
import { createClient } from "@/lib/supabase";
import { useLanguage } from "@/context/LanguageContext";
import {
  toProfileLabeledChipOptions,
  toProfileStringChipOptions,
} from "@/lib/profile-option-labels";
import { translateProfileLabel } from "@/lib/profile-translations";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const emptyForm = (): PetProfileFormInput => ({
  name: "",
  speciesForm: "dog",
  species: "dog",
  breed: "",
  dateOfBirth: "",
  gender: "Male",
  size: "5_10_kg",
  energyLevel: "Medium",
  temperament: [],
  requiresMedication: false,
  healthCharacteristics: "",
  feedingSchedule: "",
  walkNeeds: "None",
  eatingHabits: "",
  positiveTraits: "",
  challengingTraits: "",
  additionalNotes: "",
  friendRequirements: [],
  availability: "",
  careLocation: petCareLocationOptions[2],
  careTypes: [],
  careTypesOther: "",
  genderOther: "",
  location: "",
  availabilityDates: [],
  address: "",
  latitude: null as number | null,
  longitude: null as number | null,
  googlePlaceId: null as string | null,
});

type NewPetFormProps = {
  petId?: string;
};

export function NewPetForm({ petId }: NewPetFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshProfile } = useProfile();
  const supabase = useMemo(() => createClient(), []);
  const isEdit = Boolean(petId);

  const [form, setForm] = useState<PetProfileFormInput>(emptyForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPetPhotoItem[]>([]);
  const [replacingExistingPhoto, setReplacingExistingPhoto] = useState(false);
  const [loadingPet, setLoadingPet] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { locale, t } = useLanguage();
  const pl = useCallback((en: string) => translateProfileLabel(en, locale), [locale]);

  const localizedAnimalTypes = useMemo(
    () => toProfileLabeledChipOptions(petAnimalTypes, locale),
    [locale],
  );
  const localizedGenderOptions = useMemo(
    () => toProfileStringChipOptions(petGenderOptions, locale),
    [locale],
  );
  const localizedSizeOptions = useMemo(
    () => toProfileLabeledChipOptions(petSizeOptions, locale),
    [locale],
  );
  const localizedEnergyOptions = useMemo(
    () => toProfileStringChipOptions(petEnergyOptions, locale),
    [locale],
  );
  const localizedTemperamentOptions = useMemo(
    () => toProfileStringChipOptions(petTemperamentOptions, locale),
    [locale],
  );
  const localizedWalkOptions = useMemo(
    () => toProfileStringChipOptions(petWalkNeedsOptions, locale),
    [locale],
  );
  const localizedFriendReqOptions = useMemo(
    () => toProfileStringChipOptions(petFriendRequirementOptions, locale),
    [locale],
  );
  const localizedCareTypeOptions = useMemo(
    () => toProfileStringChipOptions(petCareTypeOptions, locale),
    [locale],
  );
  const localizedCareLocationOptions = useMemo(
    () => toProfileStringChipOptions(petCareLocationOptions, locale),
    [locale],
  );

  useEffect(() => {
    if (!petId || !user?.id) return;
    const ownerId = user.id;
    let cancelled = false;

    async function load() {
      setLoadingPet(true);
      setError(null);
      try {
        const row = await fetchPetForOwner(supabase, ownerId, petId!);
        if (cancelled) return;
        if (!row) {
          setError("Pet not found.");
          return;
        }
        setForm(mapPetRecordToFormInput(row));
        const loadedPhotos = await fetchPetPhotosForOwner(supabase, ownerId, petId!);
        if (cancelled) return;
        setExistingPhotos(
          loadedPhotos
            .map((photo) => ({
              id: photo.id,
              url: photo.public_url?.trim() || "",
              isPrimary: photo.is_primary,
              mediaType:
                photo.media_type === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(photo.public_url ?? "")
                  ? ("video" as const)
                  : ("image" as const),
            }))
            .filter((photo) => photo.url.length > 0),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t.account.petsPage.loadPetError);
        }
      } finally {
        if (!cancelled) setLoadingPet(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [petId, user, supabase]);

  async function handleReplaceExistingPhoto(photoId: string, file: File) {
    if (!user?.id || !petId) return;
    setReplacingExistingPhoto(true);
    setError(null);
    try {
      await replacePetPhotoImage(supabase, user.id, petId, photoId, file);
      const loadedPhotos = await fetchPetPhotosForOwner(supabase, user.id, petId);
      setExistingPhotos(
        loadedPhotos
          .map((photo) => ({
            id: photo.id,
            url: photo.public_url?.trim() || "",
            isPrimary: photo.is_primary,
            mediaType:
              photo.media_type === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(photo.public_url ?? "")
                ? ("video" as const)
                : ("image" as const),
          }))
          .filter((photo) => photo.url.length > 0),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t.account.petsPage.updatePhotoError);
      throw err;
    } finally {
      setReplacingExistingPhoto(false);
    }
  }

  function patch<K extends keyof PetProfileFormInput>(key: K, value: PetProfileFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleList(key: "temperament" | "friendRequirements" | "careTypes", value: string) {
    setForm((prev) => {
      const list = prev[key];
      return {
        ...prev,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      };
    });
  }

  function buildPayload(): PetProfileFormInput {
    return {
      ...form,
      name: form.name.trim(),
      species: toDbSpecies(form.speciesForm),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const payload = buildPayload();
    if (!payload.name) {
      setError("Please enter your pet's name.");
      return;
    }
    const locationText = finalizeLocationText(
      locationInputDisplayValue(payload.address, payload.location),
    );
    if (!locationText) {
      setError("Please enter an address or location.");
      return;
    }

    if (payload.speciesForm === "other" && !payload.breed.trim()) {
      setError("Please specify what species your pet is.");
      return;
    }

    const otherError = validateOtherOptionFields([
      { selected: payload.careTypes, otherText: payload.careTypesOther, fieldLabel: "care type" },
      ...(payload.gender === "Other"
        ? [{ selected: ["other"], otherText: payload.genderOther, fieldLabel: "gender" }]
        : []),
    ]);
    if (otherError) {
      setError(otherError);
      return;
    }

    if (!isEdit) {
      try {
        validatePetPhotoFiles(photos);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Please add at least one photo or video.");
        return;
      }
    }

    const hasGoogleCoords = payload.latitude != null && payload.longitude != null;
    const savePayload: PetProfileFormInput = {
      ...payload,
      location: hasGoogleCoords
        ? finalizeLocationText(payload.location) || locationText
        : locationText,
      address: hasGoogleCoords
        ? finalizeLocationText(payload.address) || locationText
        : locationText,
    };

    setSaving(true);
    setError(null);
    try {
      if (isEdit && petId) {
        await updatePetProfile(supabase, user.id, petId, savePayload);
        if (photos.length > 0) {
          await uploadAndAttachPetPhotos(supabase, user.id, petId, photos, savePayload.name, {
            append: true,
          });
        }
      } else {
        await createPetWithPhotos(supabase, user.id, savePayload, photos);
      }
      await refreshProfile();
      notifyDashboardRefresh();
      router.push("/pets");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.account.petsPage.savePetError);
    } finally {
      setSaving(false);
    }
  }

  if (loadingPet) {
    return <p className="text-sm text-muted">{t.account.petsPage.loadingPetProfile}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <p className="rounded-xl bg-brand-pink-muted/50 px-3 py-2 text-sm text-brand-pink" role="alert">
          {error}
        </p>
      ) : null}

      <PetFormSection
        title={pl("Pet media")}
        description={pl(
          "Add up to 6 photos or videos that best show your pet's personality and charm!",
        )}
      >
        <PetPhotoUpload
          files={photos}
          onChange={setPhotos}
          disabled={saving}
          optional={isEdit}
          existingPhotos={existingPhotos}
          replacingExisting={replacingExistingPhoto}
          onReplaceExistingPhoto={isEdit && petId ? handleReplaceExistingPhoto : undefined}
        />
      </PetFormSection>

      <PetFormSection title={pl("Basic pet details")}>
        <div className="sm:col-span-2">
          <label htmlFor="pet_name" className="form-field-label">
            {pl("Pet name")}
          </label>
          <input
            id="pet_name"
            value={form.name}
            onChange={(e) => patch("name", e.target.value)}
            required
            className="input-field mt-1"
            placeholder="e.g. Luna"
          />
        </div>
        <div>
          <label htmlFor="species" className="form-field-label">
            {pl("Animal type")}
          </label>
          <select
            id="species"
            value={form.speciesForm}
            onChange={(e) => patch("speciesForm", e.target.value)}
            className="input-field mt-1"
          >
            {localizedAnimalTypes.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="breed" className="form-field-label">
            {form.speciesForm === "other" ? OTHER_FIELD_COPY.petSpecies.label : pl("Breed")}
          </label>
          <input
            id="breed"
            value={form.breed}
            onChange={(e) => patch("breed", e.target.value)}
            required={form.speciesForm === "other"}
            className="input-field mt-1"
            placeholder={
              form.speciesForm === "other"
                ? OTHER_FIELD_COPY.petSpecies.placeholder
                : "Optional"
            }
          />
        </div>
        <div>
          <label htmlFor="dob" className="form-field-label">
            {pl("Date of Birth")}
          </label>
          <input
            id="dob"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => patch("dateOfBirth", e.target.value)}
            className="input-field mt-1"
          />
        </div>
        <div>
          <label htmlFor="gender" className="form-field-label">
            {pl("Gender")}
          </label>
          <select
            id="gender"
            value={form.gender}
            onChange={(e) => {
              const gender = e.target.value;
              setForm((prev) => ({
                ...prev,
                gender,
                genderOther: gender === "Other" ? prev.genderOther : "",
              }));
            }}
            className="input-field mt-1"
          >
            {localizedGenderOptions.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          {form.gender === "Other" ? (
            <OtherOptionTextInput
              id="gender_other"
              label={OTHER_FIELD_COPY.gender.label}
              placeholder={OTHER_FIELD_COPY.gender.placeholder}
              value={form.genderOther}
              onChange={(genderOther) => patch("genderOther", genderOther)}
              disabled={saving}
            />
          ) : null}
        </div>
        <div>
          <label htmlFor="size" className="form-field-label">
            {pl("Weight category")}
          </label>
          <select
            id="size"
            value={form.size}
            onChange={(e) => patch("size", e.target.value)}
            className="input-field mt-1"
          >
            {localizedSizeOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="energy" className="form-field-label">
            {pl("Energy level")}
          </label>
          <select
            id="energy"
            value={form.energyLevel}
            onChange={(e) => patch("energyLevel", e.target.value)}
            className="input-field mt-1"
          >
            {localizedEnergyOptions.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
      </PetFormSection>

      <PetFormSection title={pl("Temperament and care")}>
        <PetFormChipGroup
          label={pl("Temperament")}
          options={localizedTemperamentOptions}
          selected={form.temperament}
          onToggle={(v) => toggleList("temperament", v)}
          disabled={saving}
        />
        <div className="sm:col-span-2">
          <span className="form-field-label">{pl("Requires medication")}</span>
          <div className="mt-2 flex gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-[#333333] dark:text-foreground">
              <input
                type="radio"
                name="medication"
                checked={form.requiresMedication}
                onChange={() => patch("requiresMedication", true)}
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-[#333333] dark:text-foreground">
              <input
                type="radio"
                name="medication"
                checked={!form.requiresMedication}
                onChange={() => patch("requiresMedication", false)}
              />
              No
            </label>
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="health" className="form-field-label">
            {pl("Health characteristics")}
          </label>
          <textarea
            id="health"
            rows={2}
            value={form.healthCharacteristics}
            onChange={(e) => patch("healthCharacteristics", e.target.value)}
            className="input-field mt-1 resize-y"
          />
        </div>
        <div>
          <label htmlFor="feeding" className="form-field-label">
            {pl("Feeding Schedule")}
          </label>
          <input
            id="feeding"
            value={form.feedingSchedule}
            onChange={(e) => patch("feedingSchedule", e.target.value)}
            className="input-field mt-1"
          />
        </div>
        <div>
          <label htmlFor="walk" className="form-field-label">
            {pl("Walk needs")}
          </label>
          <select
            id="walk"
            value={form.walkNeeds}
            onChange={(e) => patch("walkNeeds", e.target.value)}
            className="input-field mt-1"
          >
            {localizedWalkOptions.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="eating" className="form-field-label">
            {pl("Eating habits")}
          </label>
          <textarea
            id="eating"
            rows={2}
            value={form.eatingHabits}
            onChange={(e) => patch("eatingHabits", e.target.value)}
            className="input-field mt-1 resize-y"
          />
        </div>
        <div>
          <label htmlFor="positive" className="form-field-label">
            {pl("Positive traits")}
          </label>
          <textarea
            id="positive"
            rows={2}
            value={form.positiveTraits}
            onChange={(e) => patch("positiveTraits", e.target.value)}
            className="input-field mt-1 resize-y"
          />
        </div>
        <div>
          <label htmlFor="challenging" className="form-field-label">
            {pl("Challenging traits")}
          </label>
          <textarea
            id="challenging"
            rows={2}
            value={form.challengingTraits}
            onChange={(e) => patch("challengingTraits", e.target.value)}
            className="input-field mt-1 resize-y"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="notes" className="form-field-label">
            {pl("Additional Notes")}
          </label>
          <textarea
            id="notes"
            rows={3}
            value={form.additionalNotes}
            onChange={(e) => patch("additionalNotes", e.target.value)}
            className="input-field mt-1 resize-y"
          />
        </div>
      </PetFormSection>

      <PetFormSection title={pl("Pet Friend requirements")}>
        <PetFormChipGroup
          label={pl("Requirements")}
          options={localizedFriendReqOptions}
          selected={form.friendRequirements}
          onToggle={(v) => toggleList("friendRequirements", v)}
          disabled={saving}
        />
      </PetFormSection>

      <PetFormSection title={pl("Availability and care location")}>
        <div className="sm:col-span-2">
          <p className="form-field-label">Available dates</p>
          <p className="mt-1 text-xs text-muted">
            Select days or ranges when your pet can be cared for. Add free-text notes below if needed.
          </p>
          <div className="mt-3 rounded-2xl border-2 border-brand-teal/25 bg-surface/90 p-3 shadow-sm ring-1 ring-black/5 sm:p-4">
            <AvailabilityCalendar
              selectedDates={form.availabilityDates}
              onChange={(dates) => patch("availabilityDates", dates)}
              disabled={saving}
              petId={petId ?? null}
              viewRole="pet-parent"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="availability" className="form-field-label">
            Availability notes
          </label>
          <textarea
            id="availability"
            rows={2}
            value={form.availability}
            onChange={(e) => patch("availability", e.target.value)}
            className="input-field mt-1 resize-y"
            placeholder="Extra context (e.g. flexible evenings, school holidays)"
          />
        </div>
        <div className="sm:col-span-2">
          <span className="form-field-label">{pl("Care location preference")}</span>
          <div className="mt-2 space-y-2">
            {localizedCareLocationOptions.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="care_location"
                  checked={form.careLocation === opt.value}
                  onChange={() => patch("careLocation", opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <PetFormChipGroup
          label={pl("Care type needed")}
          options={localizedCareTypeOptions}
          selected={form.careTypes}
          onToggle={(v) => toggleList("careTypes", v)}
          disabled={saving}
          otherField={{
            text: form.careTypesOther,
            onTextChange: (careTypesOther) => patch("careTypesOther", careTypesOther),
            label: OTHER_FIELD_COPY.careType.label,
            placeholder: OTHER_FIELD_COPY.careType.placeholder,
            inputId: "pet_care_types_other",
          }}
        />
        <div className="sm:col-span-2">
          <label htmlFor="location" className="form-field-label">
            {pl("Location / address")}
          </label>
          <GooglePlacesInput
            id="location"
            value={locationInputDisplayValue(form.address, form.location)}
            onChange={(text) => {
              setForm((prev) => ({
                ...prev,
                location: text,
                address: text,
                latitude: null,
                longitude: null,
                googlePlaceId: null,
              }));
            }}
            onPlaceSelect={(place) => {
              setForm((prev) => ({
                ...prev,
                location: shortLocationLabel(place),
                address: place.formatted_address,
                latitude: place.latitude,
                longitude: place.longitude,
                googlePlaceId: place.place_id,
              }));
            }}
            required
            disabled={saving}
            className="input-field mt-1"
            placeholder="Type an address or city"
            datalistId={PET_LOCATION_DATALIST_ID}
          />
          <datalist id={PET_LOCATION_DATALIST_ID}>
            {PROFILE_LOCATION_CITY_OPTIONS.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-muted">
            {getGoogleMapsApiKey()
              ? "Start typing for Google address suggestions, or pick a city from the list."
              : "Choose a suggested city or type your area."}
          </p>
        </div>
      </PetFormSection>

      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? pl("Saving…") : isEdit ? pl("Save changes") : pl("Save pet profile")}
      </Button>
    </form>
  );
}
