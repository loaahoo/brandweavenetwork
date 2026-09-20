/**
 * Read models used by pages. Every function is scoped to an organization
 * (brand id) — the same shape the Prisma-backed version will have.
 */
import { AOV_BANDS } from "./constants";
import { BRANDS, CURRENT_BRAND_ID, getBrand } from "./data/brands";
import { channelsForBrand } from "./data/channels";
import { ASSETS } from "./data/ledger";
import { store } from "./store";
import type { Brand, CompensationModel, Partnership, Transaction } from "./types";
import { DEMO_NOW, addDays } from "./utils";

export const currentBrand = () => getBrand(CURRENT_BRAND_ID)!;

export function partnerOf(p: Partnership, me = CURRENT_BRAND_ID): Brand {
  return getBrand(p.brandAId === me ? p.brandBId : p.brandAId)!;
}

export const myPartnerships = (me = CURRENT_BRAND_ID) =>
  store().partnerships.filter((p) => p.brandAId === me || p.brandBId === me).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

/* ------------------------------------------------------------------ */
/* Discover                                                             */
/* ------------------------------------------------------------------ */

export interface DiscoverFilters {
  q?: string;
  industry?: string;
  category?: string;
  audience?: string;
  geography?: string;
  size?: string;
  channel?: string;
  model?: string;
  presence?: string;
  type?: string;
  aov?: string;
  stage?: string;
}

const has = (list: string[], needle: string) => list.some((x) => x.toLowerCase().includes(needle.toLowerCase()));

export function discoverBrands(f: DiscoverFilters, me = CURRENT_BRAND_ID) {
  return BRANDS.filter((b) => b.id !== me)
    .filter((b) => {
      if (f.q) {
        const hay = [b.name, b.tagline, b.industry, b.subcategory, ...b.productCategories, ...b.lookingFor].join(" ").toLowerCase();
        if (!f.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      if (f.industry && b.industry !== f.industry) return false;
      if (f.category && !has(b.productCategories, f.category)) return false;
      if (f.audience && !b.audience.segments.includes(f.audience)) return false;
      if (f.geography && !(b.markets.includes(f.geography) || b.markets.includes("Global"))) return false;
      if (f.size && b.size !== f.size) return false;
      if (f.channel) {
        const chans = channelsForBrand(b.id);
        if (!chans.some((c) => c.category === f.channel || c.name === f.channel)) return false;
      }
      if (f.model && !b.partnershipModels.includes(f.model as CompensationModel)) return false;
      if (f.presence && b.presence !== f.presence && !(f.presence !== "Omnichannel" && b.presence === "Omnichannel")) return false;
      if (f.type && b.businessType !== f.type) return false;
      if (f.aov) {
        const band = AOV_BANDS.find((x) => x.id === f.aov);
        if (band && !(b.averageOrderValueCents >= band.min && b.averageOrderValueCents < band.max)) return false;
      }
      if (f.stage && !b.lifecycleStages.includes(f.stage as Brand["lifecycleStages"][number])) return false;
      return true;
    })
    .map((b) => ({ brand: b, channels: channelsForBrand(b.id).filter((c) => c.status !== "Paused") }));
}

/* ------------------------------------------------------------------ */
/* Ledger                                                               */
/* ------------------------------------------------------------------ */

/** Transactions where `me` is the paying brand (partner revenue) or the promoter. */
export const transactionsFor = (me = CURRENT_BRAND_ID): Transaction[] =>
  store()
    .transactions.filter((t) => t.payerId === me || t.promoterId === me)
    .sort((a, b) => b.date.localeCompare(a.date));

export const linksFor = (me = CURRENT_BRAND_ID) =>
  store()
    .links.filter((l) => l.payerId === me || l.promoterId === me)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const payoutsFor = (me = CURRENT_BRAND_ID) =>
  store()
    .payouts.filter((p) => p.payerId === me || p.promoterId === me)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));

export const assetsFor = (brandId: string) => ASSETS.filter((a) => a.brandId === brandId);

/* ------------------------------------------------------------------ */
/* Analytics                                                            */
/* ------------------------------------------------------------------ */

export interface DayPoint {
  date: string;
  partnerRevenue: number;
  revenueForPartners: number;
  conversions: number;
}

export interface Analytics {
  /** Revenue partners drove to me. */
  partnerRevenueCents: number;
  /** Revenue I drove to partners. */
  revenueForPartnersCents: number;
  commissionOwedCents: number;
  commissionEarnedCents: number;
  commissionPaidCents: number;
  flatFeesCents: number;
  totalCostCents: number;
  roas: number;
  sales: number;
  conversions: number;
  clicks: number;
  conversionRate: number;
  aovCents: number;
  newCustomers: number;
  activePartnerships: number;
  pendingPayoutsCents: number;
  series: DayPoint[];
  byPartner: { id: string; name: string; revenueCents: number; conversions: number }[];
  byChannel: { name: string; revenueCents: number; conversions: number }[];
  byCampaign: { name: string; revenueCents: number; conversions: number }[];
  byCountry: { name: string; revenueCents: number; conversions: number }[];
}

const monthKey = (iso: string) => iso.slice(0, 10);

function tally<K extends string>(rows: Transaction[], key: (t: Transaction) => K) {
  const m = new Map<K, { revenueCents: number; conversions: number }>();
  for (const t of rows) {
    const cur = m.get(key(t)) ?? { revenueCents: 0, conversions: 0 };
    cur.revenueCents += t.saleCents;
    cur.conversions += 1;
    m.set(key(t), cur);
  }
  return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenueCents - a.revenueCents);
}

export function analyticsFor(me = CURRENT_BRAND_ID, days = 90): Analytics {
  const from = addDays(DEMO_NOW, -days);
  const all = transactionsFor(me).filter((t) => t.date >= from);
  const live = all.filter((t) => t.status !== "Reversed");
  const inbound = live.filter((t) => t.payerId === me); // partners → me
  const outbound = live.filter((t) => t.promoterId === me); // me → partners

  const sum = (rows: Transaction[], f: (t: Transaction) => number) => rows.reduce((s, t) => s + f(t), 0);
  const s = store();
  const myLinks = s.links.filter((l) => l.payerId === me || l.promoterId === me);
  const clicks = myLinks.reduce((n, l) => n + l.clicks, 0);
  const partnerRevenueCents = sum(inbound, (t) => t.saleCents);
  const commissionPaidCents = sum(inbound.filter((t) => t.status === "Paid"), (t) => t.commissionCents);
  const commissionOwedCents = sum(inbound.filter((t) => t.status !== "Paid"), (t) => t.commissionCents);
  const flatFeesCents = s.flatFees.filter((f) => f.payerId === me && f.status === "Paid").reduce((n, f) => n + f.amountCents, 0);
  const totalCostCents = commissionPaidCents + commissionOwedCents + flatFeesCents;

  // Daily series, zero-filled so charts have a continuous axis.
  const buckets = new Map<string, DayPoint>();
  for (let i = days; i >= 0; i--) {
    const d = monthKey(addDays(DEMO_NOW, -i));
    buckets.set(d, { date: d, partnerRevenue: 0, revenueForPartners: 0, conversions: 0 });
  }
  for (const t of live) {
    const b = buckets.get(monthKey(t.date));
    if (!b) continue;
    if (t.payerId === me) b.partnerRevenue += t.saleCents;
    if (t.promoterId === me) b.revenueForPartners += t.saleCents;
    b.conversions += 1;
  }

  const partnerId = (t: Transaction) => (t.promoterId === me ? t.payerId : t.promoterId);
  const byPartner = tally(live, partnerId).map((r) => ({
    id: r.name,
    name: getBrand(r.name)?.name ?? r.name,
    revenueCents: r.revenueCents,
    conversions: r.conversions,
  }));

  return {
    partnerRevenueCents,
    revenueForPartnersCents: sum(outbound, (t) => t.saleCents),
    commissionOwedCents,
    commissionEarnedCents: sum(outbound, (t) => t.commissionCents),
    commissionPaidCents,
    flatFeesCents,
    totalCostCents,
    roas: totalCostCents ? partnerRevenueCents / totalCostCents : 0,
    sales: live.length,
    conversions: live.length,
    clicks,
    conversionRate: clicks ? live.length / clicks : 0,
    aovCents: live.length ? Math.round(sum(live, (t) => t.saleCents) / live.length) : 0,
    newCustomers: live.filter((t) => t.customerType === "new").length,
    activePartnerships: myPartnerships(me).filter((p) => p.stage === "Live").length,
    pendingPayoutsCents: payoutsFor(me)
      .filter((p) => p.payerId === me && p.status !== "Paid")
      .reduce((n, p) => n + p.commissionCents + p.flatFeeCents + p.adjustmentCents, 0),
    series: [...buckets.values()],
    byPartner,
    byChannel: tally(live, (t) => t.channelName),
    byCampaign: tally(live, (t) => t.campaignName),
    byCountry: tally(live, (t) => t.country ?? "Unknown"),
  };
}

/** Roll daily points up to weeks (Monday start) so 90 days read as ~13 points, not noise. */
export function weekly(points: DayPoint[]) {
  const weeks = new Map<string, { date: string; partnerRevenue: number; revenueForPartners: number; conversions: number }>();
  for (const p of points) {
    const d = new Date(`${p.date}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = d.toISOString().slice(0, 10);
    const w = weeks.get(key) ?? { date: key, partnerRevenue: 0, revenueForPartners: 0, conversions: 0 };
    w.partnerRevenue += p.partnerRevenue;
    w.revenueForPartners += p.revenueForPartners;
    w.conversions += p.conversions;
    weeks.set(key, w);
  }
  return [...weeks.values()].sort((a, b) => a.date.localeCompare(b.date));
}
