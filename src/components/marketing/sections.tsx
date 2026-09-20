import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  Crown,
  Handshake,
  Link2,
  Mail,
  MessageSquareText,
  MousePointerClick,
  Package,
  Percent,
  ReceiptText,
  Rocket,
  ScanSearch,
  Search,
  Share2,
  ShoppingBag,
  Smartphone,
  Store,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { WeaveArt } from "@/components/brand/weave";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE = "mx-auto max-w-[1200px] px-5 sm:px-8";

function SectionHead({ eyebrow, title, body, className, invert }: { eyebrow?: string; title: string; body?: string; className?: string; invert?: boolean }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow && <div className={cn("mb-3 text-[13px] font-semibold uppercase tracking-[0.14em]", invert ? "text-brand-300" : "text-brand-600")}>{eyebrow}</div>}
      <h2 className={cn("text-3xl font-semibold tracking-tight sm:text-[40px] sm:leading-[1.1]", invert ? "text-white" : "text-ink")}>{title}</h2>
      {body && <p className={cn("mt-4 text-lg leading-relaxed", invert ? "text-slate-300" : "text-slate-600")}>{body}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                 */
/* ------------------------------------------------------------------ */

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_75%_0%,var(--color-brand-100),transparent_70%)] opacity-70" />
      <div className={cn(PAGE, "relative grid items-center gap-14 pb-20 pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-24")}>
        <div className="fade-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[13px] font-medium text-slate-600 shadow-card">
            <LogoMark className="size-4" /> Brand Weave Network
          </div>
          <h1 className="text-[44px] font-semibold leading-[1.02] tracking-[-0.03em] text-ink sm:text-[64px]">The partnership network for brands.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Discover complementary brands, share marketing channels, build partnerships, and turn shared customer experiences into measurable growth.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/signup" size="lg">
              Join the Network <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/discover" variant="secondary" size="lg">
              Explore Brand Partnerships
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm font-medium text-slate-500">Stronger brands, woven together.</p>
        </div>

        <HeroProduct />
      </div>
    </section>
  );
}

/** A compact, believable slice of the product: a Deal Room with two-way terms. */
function HeroProduct() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-50 via-white to-teal-50 opacity-80" />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-float">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="inline-flex -space-x-1">
              <span className="flex size-8 items-center justify-center rounded-lg text-[11px] font-semibold text-white ring-2 ring-white" style={{ background: "#5b5cf3" }}>
                LL
              </span>
              <span className="flex size-8 items-center justify-center rounded-lg text-[11px] font-semibold text-white ring-2 ring-white" style={{ background: "#0fa7a0" }}>
                VG
              </span>
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">Lumen Labs × Voyago</div>
              <div className="text-xs text-slate-500">Deal Room · Illustrative</div>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">Live</span>
        </div>

        <div className="flex gap-1.5 px-5 pt-4 text-xs font-medium">
          {["Discussion", "Proposal", "Terms", "Integration", "Live"].map((s, i) => (
            <span key={s} className={cn("rounded-full px-2.5 py-1", i === 4 ? "bg-ink text-white" : "bg-brand-50 text-brand-700")}>
              {s}
            </span>
          ))}
        </div>

        <div className="space-y-3 p-5">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-ink">Voyago → Lumen</span>
              <span className="text-slate-500">Booking confirmation · 2.1M customers / month</span>
            </div>
            <div className="mt-2 text-lg font-semibold tracking-tight text-ink">$10,000 launch fee + 12% commission</div>
          </div>
          <div className="flex justify-center text-slate-400">
            <ArrowLeftRight className="size-4 rotate-90" />
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-semibold text-ink">Lumen → Voyago</span>
              <span className="text-slate-500">Owner newsletter · 780K subscribers</span>
            </div>
            <div className="mt-2 text-lg font-semibold tracking-tight text-ink">6% of approved revenue</div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            {[
              ["Partner Revenue", "$41.2K"],
              ["Conversions", "118"],
              ["Payable", "$4.9K"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="text-[11px] text-slate-500">{l}</div>
                <div className="text-base font-semibold tracking-tight text-ink">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Discovery                                                         */
/* ------------------------------------------------------------------ */

const PAIRS = [
  ["Travel", "Technology", "#0fa7a0", "#5b5cf3"],
  ["Fitness", "Hospitality", "#e11d74", "#2c2980"],
  ["Entertainment", "Wearables", "#f2705c", "#5b5cf3"],
  ["Beauty", "Wellness", "#c2417a", "#3d7a6b"],
  ["Automotive", "Travel", "#334155", "#0fa7a0"],
  ["Commerce", "Finance", "#b45309", "#0b1020"],
] as const;

export function Discovery() {
  return (
    <section id="discover" className="scroll-mt-16 bg-white py-20 sm:py-28">
      <div className={PAGE}>
        <SectionHead
          eyebrow="Discover"
          title="Find the brands your customers need next."
          body="Your customers already buy from other brands before, after and around you. Brand Weave shows you which complementary brands share your audience, and which of their channels are open to you."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PAIRS.map(([a, b, ca, cb]) => (
            <div key={a + b} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition-shadow hover:shadow-raised">
              <div className="flex items-center gap-3">
                <span className="inline-flex -space-x-2.5" aria-hidden>
                  <span className="size-9 rounded-full ring-2 ring-white" style={{ background: ca }} />
                  <span className="size-9 rounded-full ring-2 ring-white" style={{ background: cb }} />
                </span>
              </div>
              <div className="mt-5 text-xl font-semibold tracking-tight text-ink">
                {a} <span className="mx-1 text-slate-300">×</span> {b}
              </div>
              <p className="mt-1.5 text-sm text-slate-500">Overlapping customers, adjacent moments, a natural reason to partner.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Channels                                                          */
/* ------------------------------------------------------------------ */

const CHANNELS: [string, LucideIcon, string][] = [
  ["Email", Mail, "Newsletters, transactional and lifecycle sends"],
  ["App", Smartphone, "Home screens, itineraries and in-app offers"],
  ["Website", Boxes, "Product pages, checkout, confirmation pages"],
  ["Post Purchase", ShoppingBag, "Order and booking confirmation moments"],
  ["Loyalty", Crown, "Member offers and rewards marketplaces"],
  ["Events", CalendarDays, "Venues, ticketing and on-site activations"],
  ["Retail", Store, "In-store displays and receipts"],
  ["Packaging", Package, "Inserts and shipment cards"],
  ["Content", BookOpen, "Editorial, guides and blogs"],
  ["Social", Share2, "Owned social audiences"],
  ["SMS", MessageSquareText, "Timely, opted-in text messages"],
  ["Push", Bell, "App and web push notifications"],
];

export function ChannelsSection() {
  return (
    <section id="channels" className="scroll-mt-16 border-y border-slate-200 bg-canvas py-20 sm:py-28">
      <div className={PAGE}>
        <SectionHead
          eyebrow="Available Channels"
          title="Turn your marketing channels into partnership opportunities."
          body="Every brand has surfaces that are underused: the confirmation page, the receipt, the newsletter, the box. List the ones you're willing to make available, set the terms you want, and let complementary brands come to you."
        />
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CHANNELS.map(([name, Icon, desc]) => (
            <div key={name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="size-5" />
              </span>
              <div className="mt-4 text-[15px] font-semibold tracking-tight text-ink">{name}</div>
              <p className="mt-1 text-[13px] leading-snug text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. How it works                                                      */
/* ------------------------------------------------------------------ */

const STEPS: [string, LucideIcon, string][] = [
  ["Discover", Search, "Find complementary brands and open channels."],
  ["Connect", Handshake, "Send a request with your idea and structure."],
  ["Negotiate", MessageSquareText, "Work it out in a private Deal Room."],
  ["Launch", Rocket, "Agree terms and go live with approved creative."],
  ["Track", MousePointerClick, "Every click and sale is attributed."],
  ["Pay", Wallet, "Commission and flat fees, calculated for you."],
  ["Grow", TrendingUp, "See what works and expand the partnership."],
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 bg-white py-20 sm:py-28">
      <div className={PAGE}>
        <SectionHead eyebrow="How it works" title="Build partnerships, not just referrals." body="Referral links are the plumbing. Brand Weave covers the whole relationship, from the first hello to the last invoice." />
        <ol className="mt-14 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-7">
          {STEPS.map(([name, Icon, desc], i) => (
            <li key={name} className="relative">
              {i < STEPS.length - 1 && <span aria-hidden className="absolute left-12 top-5 hidden h-px w-[calc(100%-2rem)] bg-gradient-to-r from-brand-300 to-transparent lg:block" />}
              <span className="relative flex size-10 items-center justify-center rounded-full bg-ink text-white ring-4 ring-white">
                <Icon className="size-[18px]" />
              </span>
              <div className="mt-4 text-xs font-medium text-slate-400">0{i + 1}</div>
              <div className="text-[17px] font-semibold tracking-tight text-ink">{name}</div>
              <p className="mt-1 text-[13px] leading-snug text-slate-500">{desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Infrastructure                                                    */
/* ------------------------------------------------------------------ */

const INFRA: [string, LucideIcon, string][] = [
  ["Tracking links", Link2, "Unique click IDs per campaign, channel and placement, with QR codes for print and packaging."],
  ["Attribution", ScanSearch, "Set windows, first or last click, new-customer rules, exclusions and geographies per agreement."],
  ["Commission management", Percent, "Percentage, CPA, CPL, CPC, revenue share, hybrid and custom, evaluated automatically."],
  ["Flat fees", ReceiptText, "Sponsorships, placements and activations tracked alongside performance payments."],
  ["Reporting", BarChart3, "Revenue by partner, campaign, channel and geography, in both directions."],
  ["Payments", Wallet, "Every sale moves from pending to approved, locked, payable and paid, with returns reversed."],
];

export function Infrastructure() {
  return (
    <section id="infrastructure" className="scroll-mt-16 border-y border-slate-200 bg-canvas py-20 sm:py-28">
      <div className={PAGE}>
        <SectionHead eyebrow="Infrastructure" title="Performance infrastructure built in." body="Affiliate tracking is the plumbing. It's built to be correct from the start: real click IDs, server-side conversions, and an auditable ledger." />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {INFRA.map(([name, Icon, desc]) => (
            <div key={name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <Icon className="size-6 text-brand-600" />
              <div className="mt-4 text-lg font-semibold tracking-tight text-ink">{name}</div>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Both ways                                                         */
/* ------------------------------------------------------------------ */

export function BothWays() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className={cn(PAGE, "grid items-center gap-14 lg:grid-cols-2")}>
        <SectionHead
          eyebrow="Reciprocal"
          title="Partnerships work both ways."
          body="Traditional affiliate programs run one way. On Brand Weave one partnership can hold both: Brand A generates revenue for Brand B, and Brand B generates revenue for Brand A, each with its own channels, terms and payouts."
        />
        <div className="rounded-3xl border border-slate-200 bg-canvas p-6 sm:p-8">
          <svg viewBox="0 0 420 220" className="h-auto w-full" role="img" aria-label="Brand A generates revenue for Brand B, and Brand B generates revenue for Brand A">
            <rect x="8" y="70" width="112" height="80" rx="16" fill="#fff" stroke="#e2e8f0" />
            <rect x="300" y="70" width="112" height="80" rx="16" fill="#fff" stroke="#e2e8f0" />
            <text x="64" y="118" textAnchor="middle" className="fill-ink text-[15px] font-semibold">
              Brand A
            </text>
            <text x="356" y="118" textAnchor="middle" className="fill-ink text-[15px] font-semibold">
              Brand B
            </text>
            <path d="M120 92 C 180 40, 240 40, 300 92" fill="none" stroke="var(--color-strand-indigo)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M294 86 l8 8 l-11 3" fill="none" stroke="var(--color-strand-indigo)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M300 128 C 240 180, 180 180, 120 128" fill="none" stroke="var(--color-strand-teal)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M126 134 l-8 -8 l11 -3" fill="none" stroke="var(--color-strand-teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="210" y="34" textAnchor="middle" className="fill-slate-600 text-[12px]">
              Revenue A generates for B
            </text>
            <text x="210" y="206" textAnchor="middle" className="fill-slate-600 text-[12px]">
              Revenue B generates for A
            </text>
          </svg>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li className="flex gap-2.5">
              <span className="mt-2 h-0.5 w-4 shrink-0 rounded-full bg-strand-indigo" /> Each direction has its own compensation and attribution.
            </li>
            <li className="flex gap-2.5">
              <span className="mt-2 h-0.5 w-4 shrink-0 rounded-full bg-strand-teal" /> One Deal Room, one ledger, two payouts.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Weave finale                                                      */
/* ------------------------------------------------------------------ */

export function WeaveFinale() {
  return (
    <section className="relative overflow-hidden bg-ink py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_20%_50%,rgb(91_92_243/0.22),transparent_70%)]" />
      <div className={cn(PAGE, "relative")}>
        <div className="text-center">
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl sm:leading-[1.05]">Stronger brands, woven together.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            A single strand can only do so much. Woven together, audiences, channels, products and experiences become something stronger than any one brand alone.
          </p>
        </div>
        <div className="mx-auto mt-14 max-w-4xl">
          <WeaveArt halo="#0b1020" strands={8} />
        </div>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/signup" variant="inverted" size="lg">
            Join the Network <ArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink href="/discover" variant="outlineInverted" size="lg">
            Explore Brand Partnerships
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
