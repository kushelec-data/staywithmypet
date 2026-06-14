"use client";

import { OtherOptionTextInput } from "@/components/profile/form/ProfileFormFields";
import type { Locale } from "@/i18n/translations";
import {
  BREED_OTHER_VALUE,
  breedsForSpeciesForm,
  isBreedOtherValue,
} from "@/lib/pet-breeds";
import { translateProfileLabel } from "@/lib/profile-translations";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type PetBreedSelectLabels = {
  breed: string;
  selectBreed: string;
  otherBreed: string;
  writeBreed: string;
};

type PetBreedSelectProps = {
  id?: string;
  speciesForm: string;
  selection: string;
  otherText: string;
  onSelectionChange: (selection: string) => void;
  onOtherTextChange: (text: string) => void;
  disabled?: boolean;
  required?: boolean;
  locale: Locale;
  labels: PetBreedSelectLabels;
  error?: string | null;
};

export function PetBreedSelect({
  id = "pet_breed",
  speciesForm,
  selection,
  otherText,
  onSelectionChange,
  onOtherTextChange,
  disabled,
  required,
  locale,
  labels,
  error,
}: PetBreedSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const options = useMemo(() => {
    return breedsForSpeciesForm(speciesForm).map((value) => ({
      value,
      label: translateProfileLabel(value, locale),
    }));
  }, [speciesForm, locale]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  const selectedLabel = useMemo(() => {
    if (!selection) return "";
    if (isBreedOtherValue(selection)) return translateProfileLabel(BREED_OTHER_VALUE, locale);
    return translateProfileLabel(selection, locale);
  }, [selection, locale]);

  useEffect(() => {
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  }, [speciesForm]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function pick(value: string) {
    onSelectionChange(value);
    if (!isBreedOtherValue(value)) onOtherTextChange("");
    setQuery("");
    setOpen(false);
  }

  function clearSelection() {
    onSelectionChange("");
    onOtherTextChange("");
    setQuery("");
    setOpen(false);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }
    if (!filtered.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = filtered[activeIndex];
      if (picked) pick(picked.value);
    }
  }

  if (!options.length) return null;

  const showOtherInput = isBreedOtherValue(selection);

  return (
    <div ref={rootRef}>
      <label htmlFor={id} className="form-field-label">
        {labels.breed}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          required={required && !selection}
          disabled={disabled}
          value={open ? query : selectedLabel}
          placeholder={labels.selectBreed}
          className="input-field w-full pr-10"
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setActiveIndex(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0);
            if (selection) onSelectionChange("");
          }}
          onKeyDown={onInputKeyDown}
        />
        {selection && !disabled ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-black/5 hover:text-foreground"
            onClick={clearSelection}
            aria-label={translateProfileLabel("Clear", locale)}
          >
            ×
          </button>
        ) : null}
        {open && filtered.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-black/10 bg-surface py-1 shadow-lg"
          >
            {filtered.map((option, index) => (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selection === option.value || index === activeIndex}
                  className={`w-full px-3 py-2 text-left text-sm ${
                    index === activeIndex || selection === option.value
                      ? "bg-mint/50 text-foreground"
                      : "text-foreground hover:bg-mint/30"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(option.value)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {open && filtered.length === 0 ? (
          <p className="absolute z-30 mt-1 w-full rounded-xl border border-black/10 bg-surface px-3 py-2 text-sm text-muted shadow-lg">
            {translateProfileLabel("No matches", locale)}
          </p>
        ) : null}
      </div>
      {showOtherInput ? (
        <OtherOptionTextInput
          id={`${id}_other`}
          label={labels.otherBreed}
          placeholder={labels.writeBreed}
          value={otherText}
          onChange={onOtherTextChange}
          disabled={disabled}
        />
      ) : null}
      {error ? (
        <p className="mt-1 text-xs text-brand-pink" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
