import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background,box-shadow,color,border-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "bg-ink text-white shadow-sm hover:bg-slate-800 active:bg-slate-900",
  brand: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
  secondary: "border border-slate-200 bg-white text-slate-800 shadow-card hover:border-slate-300 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  inverted: "bg-white text-ink shadow-sm hover:bg-slate-100",
  outlineInverted: "border border-white/25 text-white hover:bg-white/10",
} as const;

const sizes = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-[15px]",
} as const;

type Common = { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string; children?: ReactNode };

export function Button({ variant = "primary", size = "md", className, ...props }: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: Common & ComponentProps<typeof Link>) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
