import { AOV_BANDS } from "./constants";
import { CURRENT_BRAND_ID } from "./data/brands";
import { countClicks, listAdjustments, listFlatFees, listLinks, listPayouts, listTransactions } from "./db/ledger";
import { listAssets, type Directory } from "./db/directory";
import { listPartnerships } from "./db/network";
import type { Brand, CompensationModel, Partnership, Transaction } from "./types";
import { addDays } from "./utils";

/** Reference data (brands, channels) comes from a per-request Directory snapshot: `await getDirectory()`. */
export const currentBrand = (dir: Directory): Brand => dir.brand(CURRENT_BRAND_ID)!;

export function partnerOf(p: Partnership, dir: Directory, me = CURRENT_BRAND_ID): Brand {
  return dir.brand(p.brandAId === me ? p.brandBId : p.brandAId)!;
}

export const myPartnerships = (me = CURRENT_BRAND_ID) => listPartnerships(me);

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

export function discoverBrands(dir: Directory, f: DiscoverFilters, me = CURRENT_BRAND_ID) {
  return dir.brands
    .filter((b) => b.id !== me)
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
        if (!dir.channelsFor(b.id).some((c) => c.category === f.channel || c.name === f.channel)) return false;
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
    .map((b) => ({ brand: b, channels: dir.channelsFor(b.id).filter((c) => c.status !== "Paused") }));
}

/* ------------------------------------------------------------------ */
/* Ledger (Postgres)                                                    */
/* ------------------------------------------------------------------ */

export const transactionsFor = (me = CURRENT_BRAND_ID): Promise<Transaction[]> => listTransactions(me);
export const linksFor = (me = CURRENT_BRAND_ID) => listLinks(me);
export const payoutsFor = (me = CURRENT_BRAND_ID) => listPayouts(me);
export const flatFeesFor = (me = CURRENT_BRAND_ID) => listFlatFees(me);
export const adjustmentsFor = (me = CURRENT_BRAND_ID) => listAdjustments(me);

export const assetsFor = (brandId: string) => listAssets(brandId);

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

const dayKey = (iso: string) => iso.slice(0, 10);

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

export async function analyticsFor(dir: Directory, me = CURRENT_BRAND_ID, days = 90): Promise<Analytics> {
  const now = new Date();
  const nowIso = now.toISOString();
  const since = new Date(now.getTime() - days * 86_400_000);

  const [all, clicks, flatFees, payouts, partnerships] = await Promise.all([
    listTransactions(me, { since }),
    countClicks(me),
    listFlatFees(me),
    listPayouts(me),
    myPartnerships(me),
  ]);

  const live = all.filter((t) => t.status !== "Reversed");
  const inbound = live.filter((t) => t.payerId === me); // partners → me
  const outbound = live.filter((t) => t.promoterId === me); // me → partners

  const sum = (rows: Transaction[], f: (t: Transaction) => number) => rows.reduce((s, t) => s + f(t), 0);
  const partnerRevenueCents = sum(inbound, (t) => t.saleCents);
  const commissionPaidCents = sum(inbound.filter((t) => t.status === "Paid"), (t) => t.commissionCents);
  const commissionOwedCents = sum(inbound.filter((t) => t.status !== "Paid"), (t) => t.commissionCents);
  const flatFeesCents = flatFees.filter((f) => f.payerId === me && f.status === "Paid").reduce((n, f) => n + f.amountCents, 0);
  const totalCostCents = commissionPaidCents + commissionOwedCents + flatFeesCents;

  // Daily series, zero-filled so charts have a continuous axis.
  const buckets = new Map<string, DayPoint>();
  for (let i = days; i >= 0; i--) {
    const d = dayKey(addDays(nowIso, -i));
    buckets.set(d, { date: d, partnerRevenue: 0, revenueForPartners: 0, conversions: 0 });
  }
  for (const t of live) {
    const b = buckets.get(dayKey(t.date));
    if (!b) continue;
    if (t.payerId === me) b.partnerRevenue += t.saleCents;
    if (t.promoterId === me) b.revenueForPartners += t.saleCents;
    b.conversions += 1;
  }

  const partnerId = (t: Transaction) => (t.promoterId === me ? t.payerId : t.promoterId);
  const byPartner = tally(live, partnerId).map((r) => ({
    id: r.name,
    name: dir.brand(r.name)?.name ?? r.name,
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
    activePartnerships: partnerships.filter((p) => p.stage === "Live").length,
    pendingPayoutsCents: payouts
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
