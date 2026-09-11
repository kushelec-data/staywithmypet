import Link from "next/link";
import { PAGE_CONTAINER, PAGE_SECTION_TIGHT } from "@/lib/layout";

export function HomeQuizPromoSection() {
  return (
    <section className={`${PAGE_SECTION_TIGHT} border-t border-black/5`}>
      <div className={`${PAGE_CONTAINER} mx-auto max-w-xl text-center`}>
        <p className="font-heading text-xl font-semibold text-foreground sm:text-2xl">Think you know dogs & cats?</p>
        <p className="mt-2 text-sm text-muted sm:text-base">Join our live pet quiz.</p>
        <Link
          href="/quiz"
          className="btn-interactive mt-4 inline-flex min-h-[36px] items-center rounded-full bg-[#C62828] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm hover:bg-[#B71C1C] sm:text-xs"
        >
          LIVE PET QUIZ
        </Link>
      </div>
    </section>
  );
}
