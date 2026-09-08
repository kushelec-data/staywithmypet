import type { ReactNode } from "react";

export function AnalyticsLineChart({
  points,
  previousPoints,
}: {
  points: Array<{ bucket: string; value: number }>;
  previousPoints?: Array<{ bucket: string; value: number }>;
}) {
  const width = 720;
  const height = 240;
  const padX = 36;
  const padY = 28;
  const max = Math.max(1, ...points.map((p) => p.value), ...(previousPoints ?? []).map((p) => p.value));
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const denom = Math.max(1, points.length - 1);
  const coords = points.map((p, i) => {
    const x = padX + (i / denom) * innerW;
    const y = padY + innerH - (p.value / max) * innerH;
    return { x, y, ...p };
  });
  const prevCoords = (previousPoints ?? []).slice(0, points.length).map((p, i) => {
    const x = padX + (i / denom) * innerW;
    const y = padY + innerH - (p.value / max) * innerH;
    return { x, y };
  });
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const prevLine = prevCoords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `${padX},${padY + innerH} ${polyline} ${padX + innerW},${padY + innerH}`;
  const labels = coords.filter((_, i) => i === 0 || i === coords.length - 1 || i === Math.floor(coords.length / 2));

  if (points.length === 0) {
    return <p className="text-sm text-white/60">No series in this range.</p>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Daily activity">
      <rect x={0} y={0} width={width} height={height} fill="transparent" />
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={padX}
          x2={width - padX}
          y1={padY + innerH * (1 - t)}
          y2={padY + innerH * (1 - t)}
          stroke="rgba(255,255,255,0.08)"
        />
      ))}
      <polygon points={area} fill="rgba(195,232,210,0.16)" />
      {prevLine ? (
        <polyline fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={1.5} strokeDasharray="5 4" points={prevLine} />
      ) : null}
      <polyline fill="none" stroke="#C3E8D2" strokeWidth={2.5} points={polyline} />
      {coords.map((c) => (
        <circle key={c.bucket} cx={c.x} cy={c.y} r={3} fill="#C3E8D2">
          <title>{`${c.bucket}: ${c.value}`}</title>
        </circle>
      ))}
      {labels.map((c) => (
        <text key={`l-${c.bucket}`} x={c.x} y={height - 8} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize={10}>
          {c.bucket.replace("T", " ")}
        </text>
      ))}
      <text x={8} y={padY + 4} fill="rgba(255,255,255,0.45)" fontSize={10}>
        {max}
      </text>
    </svg>
  );
}

export function KpiChange({ label, direction }: { label: string; direction: "up" | "down" | "flat" | "new" }) {
  const color =
    direction === "up" || direction === "new"
      ? "text-[#A0E480]"
      : direction === "down"
        ? "text-[#F06A7A]"
        : "text-white/50";
  return <p className={`mt-1 text-xs font-semibold ${color}`}>{label}</p>;
}

export function AnalyticsPanel({
  title,
  hint,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[20px] border border-[#2A4A34] bg-[#173322] p-5 text-white ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
      </div>
      {hint ? <p className="mb-3 text-xs text-white/55">{hint}</p> : null}
      {children}
    </section>
  );
}
