import type { HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEAL_STAGES, type DealStage, type TransactionStatus } from "@/lib/types";

/* ---------- Badge ---------- */

const tones = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
  coral: "bg-orange-50 text-orange-700 ring-orange-200",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", className, ...props }: { tone?: Tone } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)}
      {...props}
    />
  );
}

const STATUS_TONE: Record<string, Tone> = {
  Pending: "amber",
  Approved: "teal",
  Locked: "brand",
  Payable: "coral",
  Paid: "green",
  Reversed: "red",
  Available: "green",
  Limited: "amber",
  Waitlist: "neutral",
  Paused: "neutral",
  Open: "green",
  "In review": "amber",
  Closed: "neutral",
  Draft: "neutral",
  Overdue: "red",
  Scheduled: "neutral",
  Live: "green",
  Connected: "green",
  "Coming soon": "neutral",
  Active: "green",
  Invited: "amber",
  Countered: "amber",
  Sent: "brand",
  Accepted: "green",
  Question: "amber",
  Declined: "red",
};

export function StatusBadge({ status }: { status: TransactionStatus | string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status}
    </Badge>
  );
}

/* ---------- Card ---------- */

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-card", className)} {...props} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4", className)}>
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Page header ---------- */

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-xs font-medium uppercase tracking-wider text-brand-600">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Stat ---------- */

export function Stat({ label, value, hint, trend, className }: { label: string; value: ReactNode; hint?: ReactNode; trend?: { value: string; positive?: boolean }; className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="text-[13px] font-medium text-slate-500">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="text-2xl font-semibold tracking-tight text-ink">{value}</div>
        {trend && (
          <span className={cn("text-xs font-medium", trend.positive === false ? "text-red-600" : "text-emerald-600")}>{trend.value}</span>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

/* ---------- Empty state ---------- */

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 [&_svg]:size-6">{icon}</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- Form fields ---------- */

const fieldBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-card placeholder:text-slate-400 transition-colors hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 disabled:bg-slate-50 disabled:text-slate-500";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-24 py-2", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-9 appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-8", className)} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }} {...props}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

/* ---------- Deal stage stepper ---------- */

export function StageStepper({ stage, className }: { stage: DealStage; className?: string }) {
  const current = DEAL_STAGES.indexOf(stage);
  return (
    <ol className={cn("flex items-center gap-1.5", className)} aria-label="Deal stage">
      {DEAL_STAGES.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-1.5" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                done && "bg-brand-50 text-brand-700",
                active && "bg-ink text-white",
                !done && !active && "bg-slate-100 text-slate-400",
              )}
            >
              {done && <Check className="size-3" />}
              {s}
            </span>
            {i < DEAL_STAGES.length - 1 && <span className={cn("h-px w-3 sm:w-5", i < current ? "bg-brand-300" : "bg-slate-200")} />}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Table ---------- */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("scrollbar-thin overflow-x-auto", className)}>
      <table className="w-full min-w-max border-collapse text-left text-sm">{children}</table>
    </div>
  );
}
export const Th = ({ className, ...props }: HTMLAttributes<HTMLTableCellElement> & { align?: "right" }) => (
  <th className={cn("whitespace-nowrap border-b border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500", className)} {...props} />
);
export const Td = ({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700", className)} {...props} />
);

/* ---------- Chips ---------- */

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600", className)}>
      {children}
    </span>
  );
}
