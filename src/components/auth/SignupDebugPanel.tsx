import {
  EXPECTED_PRODUCTION_SIGNUP_CALLBACK,
  type SignupDebugSnapshot,
  signupOutcomeLabel,
} from "@/lib/auth-signup-dev";

type SignupDebugPanelProps = {
  snapshot: SignupDebugSnapshot;
};

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-amber-200/80 py-1.5 last:border-b-0">
      <dt className="font-medium text-amber-950">{label}</dt>
      <dd className="break-all font-mono text-xs text-amber-900">{value}</dd>
    </div>
  );
}

export function SignupDebugPanel({ snapshot }: SignupDebugPanelProps) {
  return (
    <aside
      className="mt-6 rounded-2xl border border-amber-300/70 bg-amber-50/90 p-4 text-left"
      aria-label="Signup debug (non-production only)"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
        Signup debug (dev/test only)
      </p>
      <p className="mt-1 text-xs text-amber-800">
        Outcome: <span className="font-mono">{signupOutcomeLabel(snapshot)}</span>
      </p>
      <dl className="mt-3">
        <DebugRow label="hasUser" value={String(snapshot.hasUser)} />
        <DebugRow label="hasSession" value={String(snapshot.hasSession)} />
        <DebugRow
          label="emailConfirmedAt"
          value={snapshot.emailConfirmedAt ?? "(null)"}
        />
        <DebugRow label="emailRedirectTo" value={snapshot.emailRedirectTo} />
        <DebugRow
          label="supabaseError"
          value={snapshot.supabaseError ?? "(none)"}
        />
        <DebugRow
          label="matchesProdUrl"
          value={String(snapshot.matchesExpectedProductionRedirect)}
        />
      </dl>
      <p className="mt-3 text-[0.65rem] leading-relaxed text-amber-800">
        Expected production redirect:{" "}
        <span className="font-mono break-all">{EXPECTED_PRODUCTION_SIGNUP_CALLBACK}</span>
      </p>
      <p className="mt-2 text-[0.65rem] text-amber-800">
        If hasUser=true and hasSession=false with no error, Supabase accepted signup but did not
        return a session (confirm-email flow). Check Supabase Dashboard → Authentication → Logs for
        email_send failures.
      </p>
    </aside>
  );
}
