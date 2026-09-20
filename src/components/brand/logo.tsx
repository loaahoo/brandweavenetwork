import { cn } from "@/lib/utils";

/**
 * The Brand Weave mark: four separate strands enter from the left, draw together, and
 * leave as one tight twisted rope.
 *
 * The rope section is a real four-strand twist: each strand orbits the rope's centre line
 * a quarter-turn out of phase with its neighbours, so strands pass in front of and behind
 * one another. Front segments are painted last, each on a thin "halo" in the page colour,
 * so every crossing reads as over/under.
 */
const COLORS = ["var(--color-strand-indigo)", "var(--color-strand-teal)", "var(--color-strand-coral)", "var(--color-strand-amber)"];

const ENTRY_Y = [6, 15, 25, 34]; // separate strands on the left
const CENTER = 20;
const RADIUS = 1.9; // how far each strand swings from the centre line inside the rope
const X_START = 2;
const X_END = 38;
const STEP = 0.5;
const TURN = 7.5; // length of a half-twist

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function sample(strand: number, x: number) {
  const draw = smooth(4, 17, x); // strands draw toward the centre line
  const twist = smooth(9, 17, x); // ...and start orbiting it
  const angle = ((x - 10) / TURN) * Math.PI + (strand * Math.PI) / 2;
  return {
    y: ENTRY_Y[strand]! + (CENTER - ENTRY_Y[strand]!) * draw + RADIUS * twist * Math.sin(angle),
    // >0: in front of the rope's axis, <0: behind. Zero while the strands are still apart.
    depth: twist * Math.cos(angle),
  };
}

type Run = { d: string; color: string; front: boolean };

/** Precomputed once: consecutive same-layer segments of a strand joined into one path. */
const RUNS: Run[] = (() => {
  const out: Run[] = [];
  for (let s = 0; s < 4; s++) {
    let current: { pts: string[]; front: boolean } | null = null;
    for (let x = X_START; x < X_END - 1e-9; x += STEP) {
      const a = sample(s, x);
      const b = sample(s, x + STEP);
      const mid = sample(s, x + STEP / 2);
      const front = mid.depth > 0.05;
      const pa = `${x.toFixed(2)} ${a.y.toFixed(2)}`;
      const pb = `${(x + STEP).toFixed(2)} ${b.y.toFixed(2)}`;
      if (!current || current.front !== front) {
        if (current) out.push({ d: `M${current.pts.join(" L")}`, color: COLORS[s]!, front: current.front });
        current = { pts: [pa, pb], front };
      } else current.pts.push(pb);
    }
    if (current) out.push({ d: `M${current.pts.join(" L")}`, color: COLORS[s]!, front: current.front });
  }
  // Behind first, in front last.
  return out.sort((p, q) => Number(p.front) - Number(q.front));
})();

export function LogoMark({ className, halo = "#ffffff", title }: { className?: string; halo?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn("size-8 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {RUNS.map((r, i) => (
        <g key={i}>
          {/* Only strands passing in front need the halo; it is what separates them from the strand behind. */}
          {r.front && <path d={r.d} stroke={halo} strokeWidth={3.9} />}
          <path d={r.d} stroke={r.color} strokeWidth={2.5} />
        </g>
      ))}
    </svg>
  );
}

export function Wordmark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark halo={inverted ? "#0b1020" : "#ffffff"} />
      <span className={cn("flex flex-col leading-none", inverted ? "text-white" : "text-ink")}>
        <span className="text-[15px] font-semibold tracking-tight">Brand Weave</span>
        <span className={cn("mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em]", inverted ? "text-white/60" : "text-slate-500")}>
          Network
        </span>
      </span>
    </span>
  );
}
