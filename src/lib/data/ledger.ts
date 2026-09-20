/**
 * Seeded ledger: tracking links, transactions, flat fees, payouts, assets, team.
 *
 * Transactions are *generated through the real commission engine* — attribution
 * check, commission, lifecycle status and reversal — so the demo data behaves
 * exactly like production data would.
 */
import {
  buildStatement,
  computeSaleCommission,
  deriveStatus,
  evaluateEligibility,
  lifecycleSchedule,
  paymentDueDate,
  reverseTransaction,
} from "../commission";
import type {
  ActivityItem,
  Adjustment,
  Asset,
  ConversionEvent,
  FlatFee,
  Integration,
  Payout,
  TeamMember,
  TrackingLink,
  Transaction,
} from "../types";
import { DEMO_NOW, addDays, formatDate, seeded } from "../utils";
import { CHANNELS } from "./channels";
import { PARTNERSHIPS } from "./partnerships";

const dirs = PARTNERSHIPS.flatMap((p) => p.directions.map((d) => ({ partnership: p, direction: d })));
const findDir = (id: string) => dirs.find((x) => x.direction.id === id)!;
const channelName = (id: string) => CHANNELS.find((c) => c.id === id)?.name ?? "Direct";

/* ------------------------------------------------------------------ */
/* Tracking links                                                       */
/* ------------------------------------------------------------------ */

type LinkSeed = Omit<TrackingLink, "clicks" | "conversions" | "revenueCents" | "promoterId" | "payerId" | "partnershipId" | "channelName" | "id">;

const LINK_SEEDS: (LinkSeed & { weight: number })[] = [
  { code: "Vg7Kq2A", directionId: "d_voyago_to_lumen", campaignName: "Q3 Travel Companion", channelId: "ch_voyago_booking", placement: "Hero card below itinerary", creative: "hero-glasses-travel-v3", kind: "Placement", destination: "https://lumenlabs.example/ai-glasses", createdAt: "2026-05-28T15:00:00.000Z", createdBy: "Maya Okafor", weight: 0.4 },
  { code: "Ht4mP9x", directionId: "d_voyago_to_lumen", campaignName: "Q3 Travel Companion", channelId: "ch_voyago_email", placement: "Packing-list sponsor", creative: "packing-list-block", kind: "Campaign", destination: "https://lumenlabs.example/travel-edition", createdAt: "2026-05-28T15:10:00.000Z", createdBy: "Maya Okafor", weight: 0.35 },
  { code: "Zb3nR8w", directionId: "d_voyago_to_lumen", campaignName: "Holiday Travel Test", channelId: "ch_voyago_booking", placement: "Sticky sidebar offer", creative: "gift-sidebar", kind: "Deep link", destination: "https://lumenlabs.example/gift-guide", createdAt: "2026-08-24T12:00:00.000Z", createdBy: "Kofi Mensah", weight: 0.25 },
  { code: "Lm5tE6c", directionId: "d_lumen_to_voyago", campaignName: "Owner Newsletter — Experiences", channelId: "ch_lumen_email", placement: "Featured partner", creative: "experiences-hero", kind: "Campaign", destination: "https://voyago.example/experiences", createdAt: "2026-06-01T10:00:00.000Z", createdBy: "Kofi Mensah", weight: 0.6 },
  { code: "Qa2sD7f", directionId: "d_lumen_to_voyago", campaignName: "Companion App — Explore", channelId: "ch_lumen_app", placement: "Discover tab", creative: "explore-tile", kind: "Placement", destination: "https://voyago.example/experiences/city-tours", createdAt: "2026-06-01T10:20:00.000Z", createdBy: "Kofi Mensah", weight: 0.4 },
  { code: "Pl9vN4j", directionId: "d_pulse_to_lumen", campaignName: "Member Bundle", channelId: "ch_pulse_app", placement: "Home banner", creative: "bundle-banner", kind: "Placement", destination: "https://lumenlabs.example/fitness", createdAt: "2026-09-16T10:00:00.000Z", createdBy: "Maya Okafor", weight: 0 },
];

/* ------------------------------------------------------------------ */
/* Transaction generation                                               */
/* ------------------------------------------------------------------ */

const rnd = seeded(20260919);
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]!;

interface GenPlan {
  directionId: string;
  count: number;
  prefix: string;
  amounts: number[]; // whole dollars
  newCustomerShare: number;
  orderStart: number;
}

const PLANS: GenPlan[] = [
  { directionId: "d_voyago_to_lumen", count: 54, prefix: "LM", amounts: [249, 349, 349, 449, 598, 698], newCustomerShare: 0.78, orderStart: 40120 },
  { directionId: "d_lumen_to_voyago", count: 26, prefix: "VG", amounts: [148, 210, 246, 318, 420], newCustomerShare: 0.9, orderStart: 918200 },
];

const START = new Date("2026-06-01T00:00:00.000Z").getTime();
const END = new Date("2026-09-17T23:00:00.000Z").getTime();
const COUNTRIES = ["US", "US", "US", "US", "CA", "GB"];

function generate(): { transactions: Transaction[]; adjustments: Adjustment[] } {
  const transactions: Transaction[] = [];
  const adjustments: Adjustment[] = [];
  let seq = 1;

  for (const plan of PLANS) {
    const { partnership, direction } = findDir(plan.directionId);
    const links = LINK_SEEDS.filter((l) => l.directionId === plan.directionId && l.weight > 0);
    const totalWeight = links.reduce((s, l) => s + l.weight, 0);
    let priorRevenue = 0;

    // Later dates are more likely (a growing partnership).
    const dates = Array.from({ length: plan.count }, () => START + (END - START) * Math.pow(rnd(), 0.75)).sort((a, b) => a - b);

    dates.forEach((t, i) => {
      // Weighted link choice, respecting each link's creation date.
      let r = rnd() * totalWeight;
      const link = links.find((l) => (r -= l.weight) <= 0) ?? links[0]!;
      const when = new Date(Math.max(t, new Date(link.createdAt).getTime() + 3_600_000)).toISOString();

      const amount = pick(plan.amounts) * 100;
      const customerType = rnd() < plan.newCustomerShare ? "new" : "existing";
      const clickAt = addDays(when, -Math.floor(rnd() * 9));
      const event: ConversionEvent = {
        orderId: `${plan.prefix}-${plan.orderStart + i * 7 + Math.floor(rnd() * 5)}`,
        clickId: `clk_seed${String(seq).padStart(4, "0")}`,
        revenueCents: amount,
        currency: "USD",
        customerType,
        country: pick(COUNTRIES),
        timestamp: when,
        source: "api",
      };
      const elig = evaluateEligibility(direction, clickAt, event);
      // The seeded events are all valid, but the check runs for real; ineligible ones are skipped.
      if (!elig.eligible) return;
      const commission = computeSaleCommission(direction.compensation, elig.eligibleRevenueCents, priorRevenue);
      priorRevenue += elig.eligibleRevenueCents;

      let tx: Transaction = {
        id: `txn_${String(seq).padStart(4, "0")}`,
        partnershipId: partnership.id,
        directionId: direction.id,
        promoterId: direction.promoterId,
        payerId: direction.payerId,
        orderId: event.orderId,
        clickId: event.clickId,
        linkId: `lnk_${link.code}`,
        date: when,
        saleCents: event.revenueCents,
        commissionCents: commission,
        currency: "USD",
        status: "Pending",
        channelName: channelName(link.channelId!),
        campaignName: link.campaignName,
        customerType,
        country: event.country,
        source: "api",
      };

      const status = deriveStatus(tx, direction.rules, DEMO_NOW);
      const sched = lifecycleSchedule(tx, direction.rules);
      const dueDate = paymentDueDate(sched.payableAt, direction.paymentTerms, direction.customPaymentDays);
      tx = { ...tx, status };
      if (status !== "Pending") tx.approvedAt = sched.approvedAt;
      if (status === "Locked" || status === "Payable") tx.lockedAt = sched.lockedAt;
      if (status === "Payable") {
        tx.payableAt = sched.payableAt;
        // Settled once the net-terms due date has passed.
        if (new Date(dueDate).getTime() <= new Date(DEMO_NOW).getTime()) {
          tx.status = "Paid";
          tx.paidAt = dueDate;
        }
      }

      // ~7% of orders are returned or cancelled.
      if (rnd() < 0.07) {
        const result = reverseTransaction(tx, rnd() < 0.5 ? "Order refunded" : "Order cancelled");
        tx = result.transaction;
        if (result.adjustment) {
          adjustments.push({ ...result.adjustment, id: `adj_${tx.id}`, createdAt: addDays(when, 20) });
        }
      }

      transactions.push(tx);
      seq++;
    });
  }

  return { transactions: transactions.sort((a, b) => b.date.localeCompare(a.date)), adjustments };
}

const generated = generate();
export const SEED_TRANSACTIONS: Transaction[] = generated.transactions;
export const SEED_ADJUSTMENTS: Adjustment[] = generated.adjustments;

/* ------------------------------------------------------------------ */
/* Links (with roll-ups derived from transactions)                      */
/* ------------------------------------------------------------------ */

export const SEED_LINKS: TrackingLink[] = LINK_SEEDS.map((full) => {
  const seed = { ...full } as LinkSeed & { weight?: number };
  delete seed.weight; // generation-only field; keep it off the stored link
  const { partnership, direction } = findDir(seed.directionId);
  const id = `lnk_${seed.code}`;
  const txns = SEED_TRANSACTIONS.filter((t) => t.linkId === id);
  const live = txns.filter((t) => t.status !== "Reversed");
  const rate = 0.022 + rnd() * 0.02;
  return {
    ...seed,
    id,
    partnershipId: partnership.id,
    promoterId: direction.promoterId,
    payerId: direction.payerId,
    channelName: channelName(seed.channelId!),
    clicks: Math.round(txns.length / rate),
    conversions: live.length,
    revenueCents: live.reduce((s, t) => s + t.saleCents, 0),
  };
});

/* ------------------------------------------------------------------ */
/* Flat fees                                                            */
/* ------------------------------------------------------------------ */

export const SEED_FLAT_FEES: FlatFee[] = [
  { id: "ff_1", partnershipId: "p_voyago", directionId: "d_voyago_to_lumen", promoterId: "voyago", payerId: "lumen", label: "Launch fee", amountCents: 1_000_000, dueDate: "2026-06-15T00:00:00.000Z", status: "Paid" },
];

/* ------------------------------------------------------------------ */
/* Payouts — one per direction per sale month                           */
/* ------------------------------------------------------------------ */

function buildPayouts(): Payout[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of SEED_TRANSACTIONS) {
    const key = `${t.directionId}|${t.date.slice(0, 7)}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const out: Payout[] = [];
  for (const [key, txns] of groups) {
    const [directionId, month] = key.split("|") as [string, string];
    const { partnership, direction } = findDir(directionId);
    const live = txns.filter((t) => t.status !== "Reversed");
    if (live.length === 0) continue;
    // Payable date is the latest lifecycle boundary in the group.
    const payableAt = live
      .map((t) => lifecycleSchedule(t, direction.rules).payableAt)
      .sort()
      .at(-1)!;
    const due = paymentDueDate(payableAt, direction.paymentTerms, direction.customPaymentDays);
    const allPaid = live.every((t) => t.status === "Paid");
    const anyPayable = live.some((t) => t.status === "Payable");
    const status: Payout["status"] = allPaid ? "Paid" : anyPayable ? (new Date(due) < new Date(DEMO_NOW) ? "Overdue" : "Payable") : "Draft";
    const statement = buildStatement({
      transactions: live.map((t) => ({ status: "Payable" as const, commissionCents: t.commissionCents })),
      flatFees: [],
    });
    const flat = SEED_FLAT_FEES.filter((f) => f.directionId === directionId && f.dueDate.slice(0, 7) === due.slice(0, 7));
    out.push({
      id: `po_${directionId}_${month}`,
      partnershipId: partnership.id,
      promoterId: direction.promoterId,
      payerId: direction.payerId,
      period: `${formatDate(`${month}-01T00:00:00.000Z`, { month: "long", year: "numeric" })} sales`,
      dueDate: due,
      status,
      commissionCents: statement.commissionCents,
      flatFeeCents: flat.reduce((s, f) => s + f.amountCents, 0),
      adjustmentCents: SEED_ADJUSTMENTS.filter((a) => txns.some((t) => `adj_${t.id}` === a.id)).reduce((s, a) => s + a.amountCents, 0),
      transactionCount: live.length,
      currency: "USD",
    });
  }
  // Upcoming flat fee with no matching sales month.
  for (const f of SEED_FLAT_FEES.filter((f) => f.status === "Scheduled")) {
    const { partnership } = findDir(f.directionId);
    out.push({
      id: `po_${f.id}`,
      partnershipId: partnership.id,
      promoterId: f.promoterId,
      payerId: f.payerId,
      period: f.label,
      dueDate: f.dueDate,
      status: "Draft",
      commissionCents: 0,
      flatFeeCents: f.amountCents,
      adjustmentCents: 0,
      transactionCount: 0,
      currency: "USD",
    });
  }
  return out.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}

export const SEED_PAYOUTS: Payout[] = buildPayouts();

/* ------------------------------------------------------------------ */
/* Assets, integrations, activity, team                                 */
/* ------------------------------------------------------------------ */

export const ASSETS: Asset[] = [
  { id: "a1", brandId: "lumen", name: "Lumen wordmark & mark (SVG, PNG)", kind: "Logo", detail: "Light, dark and monochrome", updatedAt: "2026-07-01T00:00:00.000Z", approved: true },
  { id: "a2", brandId: "lumen", name: "Lumen Travel Edition — hero", kind: "Product image", detail: "3000×2000 · PNG", updatedAt: "2026-08-14T00:00:00.000Z", approved: true },
  { id: "a3", brandId: "lumen", name: "Hands-free travel — 30s", kind: "Video", detail: "1080p · MP4 · 34 MB", updatedAt: "2026-08-14T00:00:00.000Z", approved: true },
  { id: "a4", brandId: "lumen", name: "Brand guidelines v4", kind: "Guidelines", detail: "PDF · 22 pages", updatedAt: "2026-06-10T00:00:00.000Z", approved: true },
  { id: "a5", brandId: "lumen", name: "Confirmation card banner 728×250", kind: "Banner", detail: "PNG · 3 sizes", updatedAt: "2026-09-02T00:00:00.000Z", approved: true },
  { id: "a6", brandId: "lumen", name: "Newsletter feature copy", kind: "Copy", detail: "3 variants", updatedAt: "2026-09-02T00:00:00.000Z", approved: false },
  { id: "a7", brandId: "lumen", name: "Travel edition landing page", kind: "Landing page", detail: "lumenlabs.example/travel-edition", updatedAt: "2026-08-20T00:00:00.000Z", approved: true },
  { id: "a8", brandId: "lumen", name: "Fall offer: free travel case", kind: "Offer", detail: "Through Nov 30 · orders over $299", updatedAt: "2026-09-10T00:00:00.000Z", approved: true },
  { id: "a9", brandId: "lumen", name: "VOYAGO10", kind: "Promo code", detail: "10% off · Voyago customers", updatedAt: "2026-06-01T00:00:00.000Z", approved: true },
];

export const INTEGRATIONS: Integration[] = [
  { id: "i_api", name: "Conversion API", description: "Server-to-server conversion events. The recommended way to attribute sales.", status: "Connected", category: "Tracking" },
  { id: "i_pixel", name: "Tracking pixel", description: "Fire a 1×1 pixel on your confirmation page. Quickest to install.", status: "Connected", category: "Tracking" },
  { id: "i_shopify", name: "Shopify", description: "Auto-send orders and returns from your Shopify store.", status: "Coming soon", category: "Commerce" },
  { id: "i_woo", name: "WooCommerce", description: "Order and refund sync for WooCommerce.", status: "Coming soon", category: "Commerce" },
  { id: "i_bigc", name: "BigCommerce", description: "Order and refund sync for BigCommerce.", status: "Coming soon", category: "Commerce" },
  { id: "i_sfcc", name: "Salesforce Commerce Cloud", description: "Enterprise commerce integration.", status: "Coming soon", category: "Commerce" },
  { id: "i_magento", name: "Magento", description: "Order and refund sync for Adobe Commerce.", status: "Coming soon", category: "Commerce" },
  { id: "i_stripe", name: "Stripe payouts", description: "Automated partner payouts through Stripe Connect.", status: "Coming soon", category: "Payments" },
  { id: "i_webhooks", name: "Webhooks", description: "Get notified when transactions change status.", status: "Available", category: "Data" },
];

export const ACTIVITY: ActivityItem[] = [
  { id: "ac1", kind: "proposal", title: "Stagecraft countered your proposal", detail: "Lumen Labs × Stagecraft Live · attribution window 45 days", at: "2026-09-19T11:30:00.000Z", href: "/partnerships/p_stage" },
  { id: "ac2", kind: "request", title: "Roamly Connect requested a partnership", detail: "Bundle a data plan into the Lumen travel edition", at: "2026-09-18T13:20:00.000Z", href: "/partnerships?tab=requests" },
  { id: "ac3", kind: "message", title: "Sam Whitfield (Voyago)", detail: "Q3 is tracking 18% above plan on the booking-confirmation card.", at: "2026-09-18T20:12:00.000Z", href: "/partnerships/p_voyago?tab=messages" },
  { id: "ac4", kind: "payment", title: "Payment scheduled to Voyago", detail: "June sales · due Aug 31 · settled", at: "2026-09-01T09:00:00.000Z", href: "/payouts" },
  { id: "ac5", kind: "link", title: "Tracking link created", detail: "Pulse member app — Home banner", at: "2026-09-16T10:00:00.000Z", href: "/links" },
  { id: "ac6", kind: "transaction", title: "New attributed sale · $349", detail: "Booking confirmation page · Voyago", at: "2026-09-17T19:42:00.000Z", href: "/transactions" },
];

export const TEAM: TeamMember[] = [
  { id: "u1", name: "Maya Okafor", email: "maya@lumenlabs.example", role: "owner", status: "Active" },
  { id: "u2", name: "Devon Reyes", email: "devon@lumenlabs.example", role: "partnership_manager", status: "Active" },
  { id: "u3", name: "Ana Ruiz", email: "ana@lumenlabs.example", role: "finance", status: "Active" },
  { id: "u4", name: "Kofi Mensah", email: "kofi@lumenlabs.example", role: "marketing_manager", status: "Active" },
  { id: "u5", name: "Ellis Park", email: "ellis@lumenlabs.example", role: "analyst", status: "Active" },
  { id: "u6", name: "Rae Lin", email: "rae@lumenlabs.example", role: "read_only", status: "Invited" },
];

export const CURRENT_USER = TEAM[0]!;
