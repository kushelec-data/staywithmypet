"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const quizPlay = pathname === "/quiz/play";

  useEffect(() => {
    document.documentElement.classList.toggle("quiz-play-active", quizPlay);
    return () => document.documentElement.classList.remove("quiz-play-active");
  }, [quizPlay]);

  return (
    <>
      <div className={quizPlay ? "hidden md:block" : undefined}>
        <Navbar />
      </div>
      <div className={quizPlay ? "flex min-h-0 flex-1 flex-col max-md:overflow-hidden" : "flex-1"}>
        <main className={quizPlay ? "flex min-h-0 flex-1 flex-col" : undefined}>{children}</main>
      </div>
      <div className={quizPlay ? "hidden md:block" : undefined}>
        <Footer />
      </div>
    </>
  );
}
