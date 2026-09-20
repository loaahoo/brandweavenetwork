"use client";

import { useId, useRef, useState } from "react";
import { formatDate, formatMoney, formatNumber } from "@/lib/utils";

export interface ChartSeries {
  key: string;
  label: string;
  /** CSS colour; use the strand tokens (indigo, teal, coral). */
  color: string;
}

export interface ChartPoint {
  date: string; // ISO date
  [key: string]: number | string;
}

const W = 720;
const H = 260;
const PAD = { top: 12, right: 16, bottom: 26, left: 52 };

/** Axis max chosen so each of the 4 gridline steps is a round number (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10 × 10ⁿ). */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const raw = v / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * pow >= raw)! * pow;
  return step * 4;
}

/**
 * Line + soft-area chart. One shared x/y axis (never dual-axis), a crosshair that
 * snaps to the nearest date, one tooltip listing every series, keyboard arrows,
 * and a table view so no value is gated behind hover.
 */
export function TimeChart({
  points,
  series,
  unit = "money",
  ariaLabel,
}: {
  points: ChartPoint[];
  series: ChartSeries[];
  /** Serializable on purpose: this is a client component, so a formatter function can't be passed from a server page. */
  unit?: "money" | "number";
  ariaLabel: string;
}) {
  const format = (n: number, compact = false) => (unit === "money" ? formatMoney(n, "USD", { compact }) : formatNumber(n, compact));
  const [active, setActive] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const uid = useId();

  const max = niceMax(Math.max(...points.flatMap((p) => series.map((s) => Number(p[s.key]) || 0)), 0));
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / max) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  const line = (key: string) => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(Number(p[key]) || 0).toFixed(1)}`).join(" ");
  const area = (key: string) => `${line(key)} L${x(points.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`;

  // A handful of evenly spaced x labels.
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((px - PAD.left) / iw) * (points.length - 1));
    setActive(Math.min(points.length - 1, Math.max(0, idx)));
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") setActive((a) => Math.min(points.length - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? points.length) - 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  }

  const tip = active !== null ? points[active] : null;
  const tipLeftPct = active !== null ? (x(active) / W) * 100 : 0;

  return (
    <div>
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-slate-600">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-pan-y select-none rounded-md outline-offset-4"
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        >
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity="0.14" />
                <stop offset="1" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-500 text-[11px] tabular-nums">
                {format(t, true)}
              </text>
            </g>
          ))}

          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text key={p.date} x={x(i)} y={H - 6} textAnchor="middle" className="fill-slate-500 text-[11px]">
                {formatDate(p.date, { month: "short", day: "numeric" })}
              </text>
            ) : null,
          )}

          {series.map((s) => (
            <g key={s.key}>
              <path d={area(s.key)} fill={`url(#${uid}-${s.key})`} />
              <path d={line(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          ))}

          {active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + ih} stroke="#94a3b8" strokeWidth={1} />
              {series.map((s) => (
                <circle key={s.key} cx={x(active)} cy={y(Number(points[active]![s.key]) || 0)} r={4.5} fill={s.color} stroke="#ffffff" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>

        {tip && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-raised"
            style={{ left: `${tipLeftPct}%`, transform: `translateX(${tipLeftPct > 60 ? "calc(-100% - 12px)" : "12px"})` }}
            role="status"
          >
            <div className="mb-1.5 text-xs text-slate-500">
              Week of {formatDate(String(tip.date), { month: "short", day: "numeric", year: "numeric" })}
            </div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-4 text-[13px]">
                <span className="flex items-center gap-2 text-slate-500">
                  <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold text-ink tabular-nums">{format(Number(tip[s.key]) || 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-[13px] font-medium text-slate-500 hover:text-slate-700">View as table</summary>
        <div className="scrollbar-thin mt-2 max-h-56 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Week of</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-600">{formatDate(p.date, { month: "short", day: "numeric" })}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right tabular-nums text-slate-800">
                      {format(Number(p[s.key]) || 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
