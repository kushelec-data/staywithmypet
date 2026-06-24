"use client";

import { ProfileEditStepPanel } from "@/components/profile/ProfileEditStepPanel";
import { Button } from "@/components/ui/Button";
import type { ProfileEditSectionKey } from "@/lib/profile-edit-sections";
import { ACCOUNT_BODY_TEXT, ACCOUNT_SECTION_TITLE } from "@/lib/account-ui";
import { Check, ArrowLeft, ArrowRight, Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

const PROFILE_EDIT_PRIMARY_BTN_CLASS =
  "bg-[#2E6B3F] shadow-md shadow-[#2E6B3F]/25 hover:bg-[#255A34]";

const PROFILE_EDIT_SECONDARY_BTN_CLASS =
  "border-[#E5E2D8] bg-[#F8F6F1] font-semibold text-foreground shadow-sm hover:bg-[#F8F6F1] hover:border-[#2E6B3F]/25";

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
  editingModeEnabled: string;
  editingModeHint: string;
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
    'input:not([type="hidden"]):not([disabled]):not([readonly]), textarea:not([disabled]), select:not([disabled])';
  const el = container.querySelector<HTMLElement>(selector);
  if (!el) return;
  el.focus({ preventScroll: true });
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }
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
    const id = window.requestAnimationFrame(() => {
      window.setTimeout(() => focusFirstEditableField(panelRef.current), 0);
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeStep?.isEditing, activeStep?.id]);

  if (!activeStep) return null;

  const tabGridClass =
    totalSteps >= 4
      ? "md:grid-cols-4"
      : totalSteps === 3
        ? "md:grid-cols-3"
        : "grid grid-cols-2 md:grid-cols-2";

  const tabMinWidthClass = totalSteps === 2 ? "min-w-0" : "min-w-[9.5rem] shrink-0 md:min-w-0";

  const tabListClass =
    totalSteps === 2
      ? "grid grid-cols-2 gap-2 sm:gap-3"
      : `flex gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] md:grid md:overflow-visible ${tabGridClass}`;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div
        ref={tabsRef}
        role="tablist"
        aria-label={labels.tabsLabel}
        className={tabListClass}
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
              className={`flex ${tabMinWidthClass} cursor-pointer flex-col gap-1.5 rounded-xl border px-3 py-3 text-left transition-colors sm:gap-2 sm:px-4 sm:py-3.5 ${
                selected
                  ? "border-[#2E6B3F]/40 bg-[#DDEEDF] shadow-sm ring-1 ring-[#E5E2D8]"
                  : "border-[#E5E2D8] bg-[#F8F6F1] hover:border-[#2E6B3F]/30 hover:bg-[#DDEEDF]/60"
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {stepLabel}
              </span>
              <span className={`leading-snug ${ACCOUNT_SECTION_TITLE} text-sm`}>{step.title}</span>
              <span
                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  step.complete
                    ? "bg-[#DDEEDF] text-[#2E6B3F]"
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
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <p className={ACCOUNT_BODY_TEXT}>{activeStep.description}</p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={activeStep.onEdit}
            disabled={activeStep.isEditing || activeStep.saving}
            className={`shrink-0 ${PROFILE_EDIT_PRIMARY_BTN_CLASS}`}
          >
            <Pencil className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            {labels.edit}
          </Button>
        </div>
        <ProfileEditStepPanel
          panelRef={panelRef}
          isEditing={activeStep.isEditing}
          error={activeStep.error}
          success={activeStep.success}
          editingModeTitle={activeStep.isEditing ? labels.editingModeEnabled : undefined}
          editingModeHint={activeStep.isEditing ? labels.editingModeHint : undefined}
        >
          {activeStep.content}
        </ProfileEditStepPanel>
      </div>

      <div className="grid gap-2 border-t border-black/5 pt-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div>
          {!isFirst ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={PROFILE_EDIT_SECONDARY_BTN_CLASS}
              onClick={() => goToIndex(activeIndex - 1)}
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              {labels.previous}
            </Button>
          ) : (
            <span />
          )}
        </div>

        <div className="flex justify-stretch sm:justify-center">
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={`w-full min-w-[10.5rem] sm:w-auto ${PROFILE_EDIT_PRIMARY_BTN_CLASS}`}
            disabled={!activeStep.isEditing || activeStep.saving}
            onClick={() => activeStep.onSave()}
          >
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
            {activeStep.saving ? labels.saving : labels.saveChanges}
          </Button>
        </div>

        <div className="flex justify-end">
          {!isLast ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className={PROFILE_EDIT_PRIMARY_BTN_CLASS}
              onClick={() => goToIndex(activeIndex + 1)}
            >
              {labels.nextStep}
              <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            </Button>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
