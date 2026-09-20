"use client";

import {
  BarChart3,
  Building2,
  Compass,
  Handshake,
  House,
  Link2,
  Menu,
  MessageSquare,
  Plug,
  Receipt,
  Settings,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BrandAvatar } from "@/components/brand/brand-avatar";
import { Wordmark } from "@/components/brand/logo";
import { NAV } from "@/lib/constants";
import type { Brand, TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS = {
  home: House,
  compass: Compass,
  sparkles: Sparkles,
  handshake: Handshake,
  message: MessageSquare,
  link: Link2,
  receipt: Receipt,
  wallet: Wallet,
  chart: BarChart3,
  plug: Plug,
  building: Building2,
  settings: Settings,
} as const;

// Grouped so the sidebar reads as the core loop: find → work together → measure → get paid.
const GROUPS: { label?: string; hrefs: string[] }[] = [
  { hrefs: ["/home"] },
  { label: "Find", hrefs: ["/discover", "/opportunities"] },
  { label: "Work together", hrefs: ["/partnerships", "/messages", "/links"] },
  { label: "Measure & pay", hrefs: ["/transactions", "/payouts", "/analytics"] },
  { label: "Manage", hrefs: ["/integrations", "/brand-profile", "/settings"] },
];

export function AppShell({
  brand,
  user,
  roleLabel,
  badges,
  children,
}: {
  brand: Brand;
  user: TeamMember;
  roleLabel: string;
  badges: Record<string, number>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  // The drawer is "open" only for the path it was opened on, so navigating closes it
  // without an effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (v: boolean) => setOpenedAt(v ? pathname : null);

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Primary">
      {GROUPS.map((g, gi) => (
        <div key={gi} className={cn(gi > 0 && "mt-5")}>
          {g.label && <div className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">{g.label}</div>}
          <ul className="space-y-0.5">
            {g.hrefs.map((href) => {
              const item = NAV.find((n) => n.href === href)!;
              const Icon = ICONS[item.icon];
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const badge = badges[href];
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <Icon className={cn("size-[18px]", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} />
                    <span className="flex-1">{item.label}</span>
                    {badge ? (
                      <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">{badge}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <Link href="/home" aria-label="Brand Weave Network home">
          <Wordmark />
        </Link>
      </div>

      <Link
        href="/brand-profile"
        className="mx-3 mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-card transition-colors hover:border-slate-300"
      >
        <BrandAvatar brand={brand} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{brand.name}</span>
          <span className="block truncate text-xs text-slate-500">{brand.industry}</span>
        </span>
      </Link>

      {nav}

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            {user.name
              .split(" ")
              .map((w) => w[0])
              .join("")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
            <span className="block truncate text-xs text-slate-500">{roleLabel}</span>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-slate-50/70 lg:block">{sidebar}</aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Link href="/home" aria-label="Brand Weave Network home">
          <Wordmark />
        </Link>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Open navigation">
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-slate-50 shadow-float">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-200" aria-label="Close navigation">
              <X className="size-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</div>
      </main>
    </div>
  );
}
