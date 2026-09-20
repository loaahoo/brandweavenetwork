import { cn } from "@/lib/utils";

/**
 * Large-format weave illustration: eight loose strands drift in from the left
 * and are pulled through a woven middle into one stronger bundle at the right.
 * Purely decorative (aria-hidden). Strands draw in once on load.
 */
const COLORS = ["var(--color-strand-indigo)", "var(--color-strand-teal)", "var(--color-strand-coral)", "var(--color-strand-amber)"];

function strandPath(i: number, total: number) {
  // Entry spread across the height, exit bundled tightly around the centre line.
  const yIn = 30 + (i * 340) / (total - 1);
  const yOut = 190 + (i - (total - 1) / 2) * 9;
  // Alternate control offsets so neighbours cross each other.
  const s = i % 2 === 0 ? 1 : -1;
  const mid = 200 + (i - (total - 1) / 2) * -34;
  return `M0 ${yIn} C 190 ${yIn}, 250 ${mid + 70 * s}, 420 ${mid} S 640 ${yOut - 30 * s}, 800 ${yOut}`;
}

export function WeaveArt({ className, strands = 8, halo = "#ffffff" }: { className?: string; strands?: number; halo?: string }) {
  return (
    <svg viewBox="0 0 800 400" fill="none" className={cn("h-auto w-full", className)} aria-hidden>
      {Array.from({ length: strands }, (_, i) => {
        const d = strandPath(i, strands);
        const color = COLORS[i % COLORS.length]!;
        return (
          <g key={i}>
            <path
              d={d}
              stroke={halo}
              strokeWidth={9}
              strokeLinecap="round"
              className="strand-anim"
              style={{ ["--len" as string]: 1100, ["--delay" as string]: `${i * 0.09}s` }}
            />
            <path
              d={d}
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
              className="strand-anim"
              style={{ ["--len" as string]: 1100, ["--delay" as string]: `${i * 0.09}s` }}
            />
          </g>
        );
      })}
    </svg>
  );
}
