"use client";

import { evaluatePasswordRules, type PasswordRuleId } from "@/lib/password-policy";
import type { Dictionary } from "@/i18n/translations";

const RULE_ORDER: PasswordRuleId[] = ["minLength", "upper", "lower", "number", "special"];

type Props = {
  password: string;
  rules: Dictionary["auth"]["passwordRules"];
};

function CheckIcon({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
        ok
          ? "border-brand-teal bg-mint/40 text-brand-teal"
          : "border-black/15 bg-surface text-muted"
      }`}
      aria-hidden
    >
      {ok ? "✓" : ""}
    </span>
  );
}

export function PasswordPolicyChecklist({ password, rules }: Props) {
  const state = evaluatePasswordRules(password);

  return (
    <ul className="mt-2 space-y-1.5 text-sm" aria-live="polite">
      {RULE_ORDER.map((id) => {
        const ok = state[id];
        return (
          <li key={id} className={`flex items-center gap-2 ${ok ? "text-brand-teal" : "text-muted"}`}>
            <CheckIcon ok={ok} />
            <span>{rules[id]}</span>
          </li>
        );
      })}
    </ul>
  );
}
