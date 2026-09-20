import { cn } from "@/lib/utils";

/**
 * Ranked horizontal bars for a single measure. Thin 8px bars grow from one baseline
 * with a rounded data-end; value at the tip; text stays in ink tokens.
 * A single series needs no legend — the card title says what is measured.
 */
export function BarList({
  rows,
  format,
  color = "var(--color-strand-indigo)",
  empty = "No data yet",
  className,
}: {
  rows: { label: string; value: number; sub?: string }[];
  format: (n: number) => string;
  color?: string;
  empty?: string;
  className?: string;
}) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className={cn("space-y-3.5", className)}>
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-medium text-slate-700">{r.label}</span>
            <span className="shrink-0 font-semibold text-ink tabular-nums">{format(r.value)}</span>
          </div>
          <div className="h-2 rounded-r-full bg-slate-100">
            <div className="h-2 rounded-r-[4px]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color }} />
          </div>
          {r.sub && <div className="mt-1 text-xs text-slate-500">{r.sub}</div>}
        </li>
      ))}
    </ul>
  );
}
