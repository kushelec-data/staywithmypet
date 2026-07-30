"use client";

import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import {
  evaluatePetFormCategories,
  getPetFormCompleteNextTarget,
  type PetFormCategoryEvaluationInput,
  type PetFormCategoryId,
  type PetFormSectionId,
} from "@/lib/pet-form-completion";
import { focusFirstInvalidField } from "@/lib/form-field-focus";

type PetFormCategoryStatusProps = {
  input: PetFormCategoryEvaluationInput;
  openSections: Partial<Record<PetFormSectionId, boolean>>;
  onOpenSection: (sectionId: PetFormSectionId) => void;
};

const CATEGORY_ORDER: PetFormCategoryId[] = [
  "basic",
  "photos",
  "care",
  "health",
  "behaviour",
  "availability",
];

export function PetFormCategoryStatus({
  input,
  openSections,
  onOpenSection,
}: PetFormCategoryStatusProps) {
  const { t } = useLanguage();
  const copy = t.petFormPhase2.categories;
  const categories = evaluatePetFormCategories(input);
  const byId = new Map(categories.map((c) => [c.id, c]));

  function handleCompleteNext() {
    const target = getPetFormCompleteNextTarget(input);
    if (!target) return;
    if (target.sectionId) {
      onOpenSection(target.sectionId);
    }
    window.setTimeout(() => {
      if (target.focusId) {
        focusFirstInvalidField([{ focusId: target.focusId }]);
      }
    }, target.sectionId && !openSections[target.sectionId] ? 150 : 0);
  }

  const hasRequiredMissing = categories.some((c) => c.status === "required_missing");

  return (
    <div className="rounded-2xl border border-black/5 bg-surface/60 p-4 sm:p-5">
      <h2 className="font-heading text-sm font-semibold text-foreground">{copy.title}</h2>
      <ul className="mt-3 space-y-2">
        {CATEGORY_ORDER.map((id) => {
          const category = byId.get(id);
          if (!category) return null;
          const label = copy[id];
          const statusCopy =
            category.status === "complete"
              ? copy.statusComplete
              : category.status === "required_missing"
                ? copy.statusRequiredMissing
                : copy.statusOptionalRemaining;
          return (
            <li key={id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium text-foreground">{label}</span>
              <span
                className={
                  category.status === "complete"
                    ? "text-brand-teal"
                    : category.status === "required_missing"
                      ? "text-red-500"
                      : "text-muted"
                }
              >
                {statusCopy}
              </span>
            </li>
          );
        })}
      </ul>
      {hasRequiredMissing ? (
        <Button type="button" variant="secondary" className="mt-4 w-full sm:w-auto" onClick={handleCompleteNext}>
          {copy.completeNext}
        </Button>
      ) : null}
    </div>
  );
}
