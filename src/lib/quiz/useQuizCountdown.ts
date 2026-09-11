"use client";

import { useEffect, useState } from "react";
import { remainingFromEndsAt } from "@/lib/quiz/timer";

export function useQuizCountdown(endsAt: string | null): number {
  const [ms, setMs] = useState(() => remainingFromEndsAt(endsAt));

  useEffect(() => {
    setMs(remainingFromEndsAt(endsAt));
    const id = window.setInterval(() => setMs(remainingFromEndsAt(endsAt)), 200);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return ms;
}
