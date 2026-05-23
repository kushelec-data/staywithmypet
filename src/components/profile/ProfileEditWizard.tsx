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
  stepProgress: string;
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
  const swipeRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollSyncRef = useRef(false);

  const totalSteps = steps.length;
  const activeStep = steps[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === totalSteps - 1;

  const progressStatus = activeStep?.complete
    ? labels.statusCompleted
    : labels.statusIncomplete;

  const progressLine = labels.stepProgress
    .replace("{current}", String(activeIndex + 1))
    .replace("{total}", String(totalSteps))
    .replace("{title}", activeStep?.title ?? "")
    .replace("{status}", progressStatus);

  const scrollTabIntoView = useCallback((index: number) => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    const tab = tabs.children[index] as HTMLElement | undefined;
    tab?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, []);

  const scrollSwipeToIndex = useCallback((index: number) => {
    const el = swipeRef.current;
    if (!el) return;
    scrollSyncRef.current = true;
    const width = el.clientWidth;
    el.scrollTo({ left: width * index, behavior: "smooth" });
    window.setTimeout(() => {
      scrollSyncRef.current = false;
    }, 400);
  }, []);

  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSteps) return;
      onActiveIndexChange(index);
      scrollTabIntoView(index);
      scrollSwipeToIndex(index);
    },
    [onActiveIndexChange, scrollSwipeToIndex, scrollTabIntoView, totalSteps],
  );

  useEffect(() => {
    scrollTabIntoView(activeIndex);
    const el = swipeRef.current;
    if (!el) return;
    scrollSyncRef.current = true;
    el.scrollLeft = el.clientWidth * activeIndex;
    const timer = window.setTimeout(() => {
      scrollSyncRef.current = false;
    }, 50);
    return () => window.clearTimeout(timer);
  }, [activeIndex, scrollTabIntoView]);

  useEffect(() => {
    if (!activeStep?.isEditing) return;
    const id = window.requestAnimationFrame(() => focusFirstEditableField(panelRef.current));
    return () => window.cancelAnimationFrame(id);
  }, [activeStep?.isEditing, activeStep?.id]);

  function handleSwipeScroll() {
    if (scrollSyncRef.current) return;
    const el = swipeRef.current;
    if (!el || el.clientWidth <= 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== activeIndex && index >= 0 && index < totalSteps) {
      onActiveIndexChange(index);
      scrollTabIntoView(index);
    }
  }

  if (!activeStep) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-foreground" aria-live="polite">
        {progressLine}
      </p>

      <div
        ref={tabsRef}
        role="tablist"
        aria-label={labels.tabsLabel}
        className="-mx-1 flex justify-center gap-3 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-1 snap-x snap-mandatory [scrollbar-width:thin]"
      >
        {steps.map((step, index) => {
          const selected = index === activeIndex;
          const tabLabel = labels.stepProgress
            .replace("{current}", String(index + 1))
            .replace("{total}", String(totalSteps))
            .replace("{title}", step.title)
            .replace(
              "{status}",
              step.complete ? labels.statusCompleted : labels.statusIncomplete,
            );
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={tabLabel}
              aria-controls={`profile-edit-panel-${step.id}`}
              id={`profile-edit-tab-${step.id}`}
              onClick={() => goToIndex(index)}
              className={`shrink-0 snap-center rounded-full p-2 transition-colors ${
                selected ? "ring-2 ring-brand-teal ring-offset-2" : "hover:bg-mint/40"
              }`}
            >
              <span
                aria-hidden
                className={`block size-3 rounded-full ${
                  step.complete
                    ? "bg-brand-teal"
                    : selected
                      ? "bg-brand-teal/50"
                      : "bg-black/15"
                }`}
              />
            </button>
          );
        })}
      </div>

      <p className="text-sm text-muted">{activeStep.description}</p>

      <div
        ref={swipeRef}
        className="-mx-4 flex overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory touch-pan-x sm:mx-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={handleSwipeScroll}
      >
        {steps.map((step, index) => (
          <div
            key={step.id}
            id={`profile-edit-panel-${step.id}`}
            role="tabpanel"
            aria-labelledby={`profile-edit-tab-${step.id}`}
            className="w-full shrink-0 snap-start px-4 sm:px-0"
          >
            <ProfileEditStepPanel
              panelRef={index === activeIndex ? panelRef : undefined}
              isEditing={step.isEditing}
              error={step.error}
              success={step.success}
            >
              {step.content}
            </ProfileEditStepPanel>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-black/5 pt-4">
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
            <Button type="button" variant="outline" size="sm" onClick={() => goToIndex(activeIndex - 1)}>
              {labels.previous}
            </Button>
          ) : null}
          {!isLast ? (
            <Button type="button" variant="primary" size="sm" onClick={() => goToIndex(activeIndex + 1)}>
              {labels.nextStep}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
