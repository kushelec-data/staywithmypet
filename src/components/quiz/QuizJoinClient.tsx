"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONTENT_CONTAINER } from "@/lib/layout";
import { parseQuizLocale, persistQuizLocale, type QuizLocale } from "@/lib/quiz/locale";
import { joinErrorCopy, playerCopy } from "@/lib/quiz/player-copy";

export function QuizJoinClient() {
  const router = useRouter();
  const [step, setStep] = useState<"language" | "pin" | "name">("language");
  const [locale, setLocale] = useState<QuizLocale>("en");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = playerCopy(locale);

  function chooseLanguage(next: QuizLocale) {
    setLocale(next);
    persistQuizLocale(next);
    setError(null);
    setStep("pin");
  }

  async function joinGame() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/quiz/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, locale }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(joinErrorCopy(locale, String(json.error ?? "")));
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
      body: JSON.stringify({ pin, displayName: name, locale }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(joinErrorCopy(locale, String(json.error ?? "")));
      return;
    }
    persistQuizLocale(parseQuizLocale(json.locale ?? locale));
    window.localStorage.setItem("swmp_quiz_player", json.token);
    router.push("/quiz/play");
  }

  return (
    <main className={`${CONTENT_CONTAINER} flex min-h-[70vh] flex-col justify-center py-10`}>
      <div className="mx-auto w-full max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2E6B3F]">StayWithMyPet</p>

        {step === "language" ? (
          <>
            <h1 className="font-heading mt-3 text-3xl font-semibold text-foreground">Choose language</h1>
            <p className="mt-2 text-xl font-semibold text-muted">Vali keel</p>
            <div className="mt-8 grid gap-3">
              <button
                type="button"
                onClick={() => chooseLanguage("et")}
                className="btn-interactive min-h-[64px] w-full rounded-2xl border border-[#E5E2D8] bg-white px-4 text-lg font-semibold shadow-sm"
              >
                Eesti
              </button>
              <button
                type="button"
                onClick={() => chooseLanguage("en")}
                className="btn-interactive min-h-[64px] w-full rounded-2xl border border-[#E5E2D8] bg-white px-4 text-lg font-semibold shadow-sm"
              >
                English
              </button>
            </div>
          </>
        ) : null}

        {step === "pin" ? (
          <>
            <h1 className="font-heading mt-3 text-3xl font-semibold text-foreground">{t.joinTitle}</h1>
            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void joinGame();
              }}
            >
              <label className="block text-left text-sm font-semibold">
                {t.gamePin}
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
                {t.join}
              </button>
            </form>
          </>
        ) : null}

        {step === "name" ? (
          <>
            <h1 className="font-heading mt-3 text-3xl font-semibold text-foreground">{t.joinTitle}</h1>
            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void joinWithName();
              }}
            >
              <label className="block text-left text-sm font-semibold">
                {t.yourName}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#E5E2D8] px-4 py-4 text-lg"
                  placeholder={locale === "et" ? "Mari" : "Alex"}
                  maxLength={24}
                />
              </label>
              {error ? <p className="text-sm text-red-700">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="btn-interactive min-h-[56px] w-full rounded-2xl bg-[#2E6B3F] px-4 text-lg font-semibold text-white disabled:opacity-50"
              >
                {t.letsPlay}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </main>
  );
}
