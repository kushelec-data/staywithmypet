"use client";

import { ProfileEditStepPanel } from "@/components/profile/ProfileEditStepPanel";
import { Button } from "@/components/ui/Button";
import type { ProfileEditSectionKey } from "@/lib/profile-edit-sections";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

export type ProfileEditWizardStep = {
  id: ProfileEditSectionKey;
  title: string;
  description: string;
  complete: boolean;
  content: ReactNode;
  isEditing: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  onEdit: () => void;
  onSave: () => void;
};

type ProfileEditWizardLabels = {
  stepNumber: string;
  statusCompleted: string;
  statusIncomplete: string;
  previous: string;
  nextStep: string;
  edit: string;
  saveChanges: string;
  saving: string;
  tabsLabel: string;
};

type ProfileEditWizardProps = {
  steps: ProfileEditWizardStep[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  labels: ProfileEditWizardLabels;
};

function focusFirstEditableField(container: HTMLElement | null) {
  if (!container) return;
  const selector =
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])';
  const el = container.querySelector<HTMLElement>(selector);
  el?.focus({ preventScroll: true });
}

export function ProfileEditWizard({
  steps,
  activeIndex,
  onActiveIndexChange,
  labels,
}: ProfileEditWizardProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const totalSteps = steps.length;
  const activeStep = steps[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === totalSteps - 1;

  const scrollTabIntoView = useCallback((index: number) => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    const tab = tabs.children[index] as HTMLElement | undefined;
    tab?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, []);

  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSteps) return;
      onActiveIndexChange(index);
      scrollTabIntoView(index);
    },
    [onActiveIndexChange, scrollTabIntoView, totalSteps],
  );

  useEffect(() => {
    scrollTabIntoView(activeIndex);
  }, [activeIndex, scrollTabIntoView]);

  useEffect(() => {
    if (!activeStep?.isEditing) return;
    const id = window.requestAnimationFrame(() => focusFirstEditableField(panelRef.current));
    return () => window.cancelAnimationFrame(id);
  }, [activeStep?.isEditing, activeStep?.id]);

  if (!activeStep) return null;

  const tabGridClass =
    totalSteps >= 4 ? "md:grid-cols-4" : totalSteps === 3 ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div
        ref={tabsRef}
        role="tablist"
        aria-label={labels.tabsLabel}
        className={`flex gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] md:grid md:overflow-visible ${tabGridClass}`}
      >
        {steps.map((step, index) => {
          const selected = index === activeIndex;
          const stepLabel = labels.stepNumber.replace("{n}", String(index + 1));
          const statusLabel = step.complete ? labels.statusCompleted : labels.statusIncomplete;
          const tabText = `${stepLabel} ${step.title}`;

          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`profile-edit-panel-${step.id}`}
              id={`profile-edit-tab-${step.id}`}
              onClick={() => goToIndex(index)}
              className={`flex min-w-[9.5rem] shrink-0 cursor-pointer flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-colors md:min-w-0 ${
                selected
                  ? "border-brand-teal/50 bg-mint/35 shadow-sm ring-1 ring-brand-teal/25"
                  : "border-black/10 bg-surface hover:border-brand-teal/35 hover:bg-mint/20"
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {stepLabel}
              </span>
              <span className="text-sm font-medium leading-snug text-foreground">{step.title}</span>
              <span
                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  step.complete
                    ? "bg-brand-teal/15 text-brand-teal"
                    : "bg-black/5 text-muted"
                }`}
              >
                {statusLabel}
              </span>
              <span className="sr-only">{tabText}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`profile-edit-panel-${activeStep.id}`}
        role="tabpanel"
        aria-labelledby={`profile-edit-tab-${activeStep.id}`}
      >
        <p className="mb-3 text-sm text-muted">{activeStep.description}</p>
        <ProfileEditStepPanel
          panelRef={panelRef}
          isEditing={activeStep.isEditing}
          error={activeStep.error}
          success={activeStep.success}
        >
          {activeStep.content}
        </ProfileEditStepPanel>
      </div>

      <div className="flex flex-col gap-3 border-t border-black/5 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={activeStep.onEdit}
            disabled={activeStep.isEditing || activeStep.saving}
          >
            {labels.edit}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!activeStep.isEditing || activeStep.saving}
            onClick={() => activeStep.onSave()}
          >
            {activeStep.saving ? labels.saving : labels.saveChanges}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isFirst ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToIndex(activeIndex - 1)}
            >
              {labels.previous}
            </Button>
          ) : null}
          {!isLast ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => goToIndex(activeIndex + 1)}
            >
              {labels.nextStep}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
