"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const quizPlay = pathname === "/quiz/play";
  const quizHost = pathname.startsWith("/admin/quiz/host/");
  const immersive = quizPlay || quizHost;

  useEffect(() => {
    document.documentElement.classList.toggle("quiz-play-active", quizPlay);
    document.documentElement.classList.toggle("quiz-host-active", quizHost);
    return () => {
      document.documentElement.classList.remove("quiz-play-active");
      document.documentElement.classList.remove("quiz-host-active");
    };
  }, [quizPlay, quizHost]);

  return (
    <>
      {quizHost ? null : (
        <div className={quizPlay ? "hidden md:block" : undefined}>
          <Navbar />
        </div>
      )}
      <div
        className={
          quizHost
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : quizPlay
              ? "flex min-h-0 flex-1 flex-col max-md:overflow-hidden"
              : "flex-1"
        }
      >
        <main className={immersive ? "flex min-h-0 flex-1 flex-col" : undefined}>{children}</main>
      </div>
      {quizHost ? null : (
        <div className={quizPlay ? "hidden md:block" : undefined}>
          <Footer />
        </div>
      )}
    </>
  );
}
