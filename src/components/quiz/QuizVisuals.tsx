export function QuizCircleTimer({
  value,
  progress,
  urgent = false,
}: {
  value: string | number;
  progress: number;
  urgent?: boolean;
}) {
  const clamped = Math.min(1, Math.max(0, progress));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative mx-auto h-28 w-28 sm:h-32 sm:w-32">
      <svg viewBox="0 0 100 100" className="-rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#E8E4DA" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={urgent ? "#C62828" : "#2E6B3F"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-heading font-semibold ${typeof value === "number" ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"} ${urgent ? "text-[#C62828]" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

export function QuizStatusChip({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-full border border-[#2E6B3F]/20 bg-[#2E6B3F]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2E6B3F]">
      {children}
    </span>
  );
}
