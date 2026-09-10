"use client";

import {
  DEFAULT_BODY_AFTER_EN,
  DEFAULT_BODY_AFTER_ET,
  DEFAULT_BODY_BEFORE_EN,
  DEFAULT_BODY_BEFORE_ET,
  DEFAULT_PREHEADER_EN,
  DEFAULT_PREHEADER_ET,
} from "@/lib/email-campaigns/html";

export type CampaignCopyFormValue = {
  subjectEn: string;
  subjectEt: string;
  preheaderEn: string;
  preheaderEt: string;
  bodyBeforeEn: string;
  bodyAfterEn: string;
  bodyBeforeEt: string;
  bodyAfterEt: string;
};

export const DEFAULT_COPY_FORM: CampaignCopyFormValue = {
  subjectEn: "",
  subjectEt: "",
  preheaderEn: DEFAULT_PREHEADER_EN,
  preheaderEt: DEFAULT_PREHEADER_ET,
  bodyBeforeEn: DEFAULT_BODY_BEFORE_EN,
  bodyAfterEn: DEFAULT_BODY_AFTER_EN,
  bodyBeforeEt: DEFAULT_BODY_BEFORE_ET,
  bodyAfterEt: DEFAULT_BODY_AFTER_ET,
};

export function EmailCampaignCopyFields({
  value,
  onChange,
  disabled,
}: {
  value: CampaignCopyFormValue;
  onChange: (next: CampaignCopyFormValue) => void;
  disabled?: boolean;
}) {
  function set<K extends keyof CampaignCopyFormValue>(key: K, next: CampaignCopyFormValue[K]) {
    onChange({ ...value, [key]: next });
  }
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-base font-semibold">English</h3>
      <label className="block text-sm">
        Subject
        <input
          disabled={disabled}
          value={value.subjectEn}
          onChange={(e) => set("subjectEn", e.target.value)}
          className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Preview text
        <input
          disabled={disabled}
          value={value.preheaderEn}
          onChange={(e) => set("preheaderEn", e.target.value)}
          className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Body before events
        <textarea
          disabled={disabled}
          value={value.bodyBeforeEn}
          onChange={(e) => set("bodyBeforeEn", e.target.value)}
          rows={10}
          className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        Body after events
        <textarea
          disabled={disabled}
          value={value.bodyAfterEn}
          onChange={(e) => set("bodyAfterEn", e.target.value)}
          rows={12}
          className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2 text-sm"
        />
      </label>

      <h3 className="mt-6 font-heading text-base font-semibold">Estonian</h3>
      <label className="block text-sm">
        Subject
        <input
          disabled={disabled}
          value={value.subjectEt}
          onChange={(e) => set("subjectEt", e.target.value)}
          className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Preview text
        <input
          disabled={disabled}
          value={value.preheaderEt}
          onChange={(e) => set("preheaderEt", e.target.value)}
          className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Body before events
        <textarea
          disabled={disabled}
          value={value.bodyBeforeEt}
          onChange={(e) => set("bodyBeforeEt", e.target.value)}
          rows={10}
          className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm">
        Body after events
        <textarea
          disabled={disabled}
          value={value.bodyAfterEt}
          onChange={(e) => set("bodyAfterEt", e.target.value)}
          rows={12}
          className="mt-1 w-full rounded-xl border border-[#E5E2D8] px-3 py-2 text-sm"
        />
      </label>
      <p className="text-xs text-muted">
        Event cards sit between the before/after sections. Sponsor links stay structured after the partner thank-you line.
      </p>
    </div>
  );
}
