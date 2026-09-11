"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONTENT_CONTAINER } from "@/lib/layout";

export function QuizJoinClient() {
  const router = useRouter();
  const [step, setStep] = useState<"pin" | "name">("pin");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function joinGame() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/quiz/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not find that game");
      return;
    }
    setStep("name");
  }

  async function joinWithName() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/quiz/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, displayName: name }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not join");
      return;
    }
    window.localStorage.setItem("swmp_quiz_player", json.token);
    router.push("/quiz/play");
  }

  return (
    <main className={`${CONTENT_CONTAINER} flex min-h-[70vh] flex-col justify-center py-10`}>
      <div className="mx-auto w-full max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2E6B3F]">StayWithMyPet</p>
        <h1 className="font-heading mt-3 text-3xl font-semibold text-foreground">Live Quiz</h1>
        <p className="mt-3 text-base text-muted">Think you really know dogs and cats?</p>

        {step === "pin" ? (
          <form
            className="mt-8 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void joinGame();
            }}
          >
            <label className="block text-left text-sm font-semibold">
              Game PIN
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#E5E2D8] px-4 py-4 text-center text-2xl tracking-[0.4em]"
                placeholder="______"
                maxLength={8}
              />
            </label>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="btn-interactive min-h-[56px] w-full rounded-2xl bg-[#2E6B3F] px-4 text-lg font-semibold text-white disabled:opacity-50"
            >
              JOIN
            </button>
          </form>
        ) : (
          <form
            className="mt-8 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void joinWithName();
            }}
          >
            <label className="block text-left text-sm font-semibold">
              What’s your name?
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#E5E2D8] px-4 py-4 text-lg"
                placeholder="Alex"
                maxLength={24}
              />
            </label>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="btn-interactive min-h-[56px] w-full rounded-2xl bg-[#2E6B3F] px-4 text-lg font-semibold text-white disabled:opacity-50"
            >
              LET’S PLAY
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
