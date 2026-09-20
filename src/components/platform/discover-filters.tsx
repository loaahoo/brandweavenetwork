"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Select } from "@/components/ui/primitives";
import { AOV_BANDS, AUDIENCES, BRAND_SIZES, BUSINESS_TYPES, CHANNEL_CATEGORIES, COMPENSATION_MODELS, GEOGRAPHIES, INDUSTRIES, LIFECYCLE_STAGES, PRESENCES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Opt = string | { value: string; label: string };
const val = (o: Opt) => (typeof o === "string" ? o : o.value);
const lab = (o: Opt) => (typeof o === "string" ? o : o.label);

const PRIMARY: { key: string; label: string; options: Opt[] }[] = [
  { key: "industry", label: "Industry", options: [...INDUSTRIES] },
  { key: "audience", label: "Audience", options: AUDIENCES },
  { key: "geography", label: "Geography", options: GEOGRAPHIES },
  { key: "channel", label: "Available channel", options: CHANNEL_CATEGORIES },
  { key: "model", label: "Compensation model", options: COMPENSATION_MODELS },
];

const MORE: { key: string; label: string; options: Opt[] }[] = [
  { key: "size", label: "Brand size", options: BRAND_SIZES },
  { key: "presence", label: "Online / offline", options: PRESENCES },
  { key: "type", label: "B2B / B2C", options: BUSINESS_TYPES },
  { key: "aov", label: "Average order value", options: AOV_BANDS.map((b) => ({ value: b.id, label: b.label })) },
  { key: "stage", label: "Customer lifecycle stage", options: LIFECYCLE_STAGES },
  { key: "category", label: "Product category", options: ["Luggage", "Smart glasses", "Skincare", "Memberships", "Flights", "Hotels", "Tickets", "Vehicles", "eSIM", "Insurance", "Apparel", "Meal kits"] },
];

const KEYS = ["q", ...PRIMARY.map((f) => f.key), ...MORE.map((f) => f.key)];

/** Filters live in the URL: shareable, back-button friendly, and rendered on the server. */
export function DiscoverFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const active = KEYS.filter((k) => params.get(k));
  const moreActive = MORE.some((f) => params.get(f.key));
  const [showMore, setShowMore] = useState(moreActive);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  }

  // Debounce free-text search.
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => set("q", q.trim()), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const field = (f: (typeof PRIMARY)[number]) => (
    <Select key={f.key} aria-label={f.label} value={params.get(f.key) ?? ""} onChange={(e) => set(f.key, e.target.value)} className={cn(params.get(f.key) && "border-brand-300 bg-brand-50/50 font-medium")}>
      <option value="">{f.label}</option>
      {f.options.map((o) => (
        <option key={val(o)} value={val(o)}>
          {lab(o)}
        </option>
      ))}
    </Select>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search brands, industries, products…"
            aria-label="Search brands"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-card placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15"
          />
        </div>
        <button
          onClick={() => setShowMore((s) => !s)}
          aria-expanded={showMore}
          className={cn("flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium shadow-card", showMore || moreActive ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}
        >
          <SlidersHorizontal className="size-4" /> More filters
        </button>
        {active.length > 0 && (
          <button onClick={() => { setQ(""); start(() => router.replace(pathname, { scroll: false })); }} className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <X className="size-4" /> Clear ({active.length})
          </button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{PRIMARY.map(field)}</div>
      {showMore && <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{MORE.map(field)}</div>}
    </div>
  );
}
