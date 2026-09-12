"use client";

import { useEffect, useState } from "react";
import { quizEffectiveNowMs, quizServerOffsetMs, remainingQuizSeconds } from "@/lib/quiz/timer";

export function useQuizCountdown(questionEndsAt: string | null, serverNow?: string | number | Date | null): number {
  const [seconds, setSeconds] = useState(() =>
    remainingQuizSeconds(questionEndsAt, quizEffectiveNowMs(quizServerOffsetMs(serverNow))),
  );

  useEffect(() => {
    const tick = () => {
      const offset = quizServerOffsetMs(serverNow);
      setSeconds(remainingQuizSeconds(questionEndsAt, quizEffectiveNowMs(offset)));
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [questionEndsAt, serverNow]);

  return seconds;
}
