import { cn } from "@/lib/utils";

/**
 * The Brand Weave mark: four separate strands enter from the left, cross and
 * interlock through the middle, and leave as one tight bundle.
 * Each strand is drawn with a thin "halo" underneath in the page colour so the
 * crossings read as over/under without literal rope texture.
 */
const STRANDS = [
  { d: "M2 6 C 15 6, 19 30, 38 29", color: "var(--color-strand-indigo)" },
  { d: "M2 15 C 13 15, 22 26, 38 24", color: "var(--color-strand-teal)" },
  { d: "M2 25 C 13 25, 22 14, 38 19", color: "var(--color-strand-coral)" },
  { d: "M2 34 C 15 34, 19 10, 38 14", color: "var(--color-strand-amber)" },
];

export function LogoMark({ className, halo = "#ffffff", title }: { className?: string; halo?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn("size-8 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {STRANDS.map((s, i) => (
        <g key={i}>
          <path d={s.d} stroke={halo} strokeWidth={5.4} strokeLinecap="round" />
          <path d={s.d} stroke={s.color} strokeWidth={2.8} strokeLinecap="round" />
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
