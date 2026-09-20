/**
 * Commission engine — pure functions, no I/O.
 *
 * Pipeline for a conversion:
 *   evaluateEligibility()  → is this sale attributable under the agreement?
 *   computeSaleCommission() → how much does the promoting brand earn?
 *   lifecycleSchedule()    → when does it become Approved / Locked / Payable?
 *   deriveStatus()         → what status is it in right now?
 *   reverseTransaction()   → returns & cancellations
 *   buildStatement()       → what does the paying brand owe in total?
 *
 * All money is integer cents; all rates are basis points.
 */
import type {
  Adjustment,
  Compensation,
  ConversionEvent,
  DealDirection,
  FlatFee,
  PaymentTerms,
  Transaction,
  TransactionRules,
  TransactionStatus,
} from "./types";
import { formatMoney, formatPercent } from "./utils";

const DAY_MS = 86_400_000;

/* ------------------------------------------------------------------ */
/* Eligibility                                                         */
/* ------------------------------------------------------------------ */

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  /** Revenue the commission is calculated on, after exclusions and pro-rated discounts. */
  eligibleRevenueCents: number;
}

export function evaluateEligibility(
  direction: Pick<DealDirection, "attribution" | "rules" | "currency">,
  clickAt: string,
  conversion: ConversionEvent,
): EligibilityResult {
  const { attribution, rules } = direction;
  const reasons: string[] = [];

  if (!attribution.clickAttribution) {
    reasons.push("Click attribution is disabled for this agreement");
  }

  const elapsed = new Date(conversion.timestamp).getTime() - new Date(clickAt).getTime();
  if (elapsed < 0) reasons.push("Conversion occurred before the click");
  else if (elapsed > attribution.windowDays * DAY_MS) {
    reasons.push(`Outside the ${attribution.windowDays}-day attribution window`);
  }

  if (conversion.currency !== direction.currency) {
    reasons.push(`Currency ${conversion.currency} does not match agreement currency ${direction.currency}`);
  }

  if (rules.customers === "new_only" && conversion.customerType !== "new") {
    reasons.push("Agreement covers new customers only");
  }

  if (rules.geoRestrictions.length > 0) {
    if (!conversion.country) reasons.push("Customer country unknown; agreement has geographic restrictions");
    else if (!rules.geoRestrictions.includes(conversion.country)) {
      reasons.push(`${conversion.country} is outside the agreed geography`);
    }
  }

  let eligibleRevenueCents = conversion.revenueCents;
  if (conversion.items && conversion.items.length > 0) {
    const gross = conversion.items.reduce((s, i) => s + i.priceCents * i.quantity, 0);
    const eligibleGross = conversion.items
      .filter((i) => !rules.excludedSkus.includes(i.sku))
      .filter((i) => rules.eligibleProducts.length === 0 || rules.eligibleProducts.includes(i.sku))
      .reduce((s, i) => s + i.priceCents * i.quantity, 0);
    // Pro-rate so order-level discounts reduce the commissionable amount too.
    eligibleRevenueCents = gross > 0 ? Math.round((conversion.revenueCents * eligibleGross) / gross) : 0;
    if (eligibleGross === 0) reasons.push("No eligible products in this order");
  }

  return { eligible: reasons.length === 0, reasons, eligibleRevenueCents: reasons.length ? 0 : eligibleRevenueCents };
}

/* ------------------------------------------------------------------ */
/* Earnings                                                            */
/* ------------------------------------------------------------------ */

const bps = (amountCents: number, rateBps: number) => Math.round((amountCents * rateBps) / 10_000);

/**
 * Performance amount owed for one attributed sale.
 * `priorRevenueCents` is cumulative eligible revenue before this sale (used for custom tiers).
 * Flat fees are never per-sale; they live in the FlatFee ledger.
 */
export function computeSaleCommission(comp: Compensation, eligibleRevenueCents: number, priorRevenueCents = 0): number {
  if (eligibleRevenueCents <= 0) return 0;
  switch (comp.model) {
    case "Commission":
    case "Revenue share":
    case "Hybrid":
      return bps(eligibleRevenueCents, comp.commissionBps ?? 0);
    case "CPA":
      return comp.cpaCents ?? 0;
    case "Custom": {
      if (!comp.tiers?.length) return bps(eligibleRevenueCents, comp.commissionBps ?? 0);
      // Marginal tiers over cumulative revenue.
      let remaining = eligibleRevenueCents;
      let cursor = priorRevenueCents;
      let total = 0;
      for (const tier of comp.tiers) {
        if (remaining <= 0) break;
        const ceiling = tier.upToCents ?? Number.POSITIVE_INFINITY;
        if (cursor >= ceiling) continue;
        const slice = Math.min(remaining, ceiling - cursor);
        total += bps(slice, tier.bps);
        remaining -= slice;
        cursor += slice;
      }
      return total;
    }
    case "CPL":
    case "CPC":
    case "Flat fee":
      return 0;
  }
}

export const computeLeadPayout = (comp: Compensation) => (comp.model === "CPL" ? comp.cplCents ?? 0 : 0);
export const computeClickPayout = (comp: Compensation) => (comp.model === "CPC" ? comp.cpcCents ?? 0 : 0);

/** Human-readable summary, e.g. "$10,000 flat fee + 12% commission". */
export function describeCompensation(comp: Compensation, currency: DealDirection["currency"] = "USD"): string {
  const money = (c?: number) => formatMoney(c ?? 0, currency);
  const flat = comp.flatFeeCents ? `${money(comp.flatFeeCents)} ${comp.flatFeeLabel ?? "flat fee"}` : undefined;
  switch (comp.model) {
    case "Commission":
      return `${formatPercent(comp.commissionBps ?? 0, (comp.commissionBps ?? 0) % 100 ? 1 : 0)} of approved revenue`;
    case "Revenue share":
      return `${formatPercent(comp.commissionBps ?? 0, (comp.commissionBps ?? 0) % 100 ? 1 : 0)} revenue share`;
    case "CPA":
      return `${money(comp.cpaCents)} per approved sale`;
    case "CPL":
      return `${money(comp.cplCents)} per qualified lead`;
    case "CPC":
      return `${money(comp.cpcCents)} per click`;
    case "Flat fee":
      return flat ?? "Flat fee";
    case "Hybrid":
      return [flat, `${formatPercent(comp.commissionBps ?? 0, (comp.commissionBps ?? 0) % 100 ? 1 : 0)} commission`]
        .filter(Boolean)
        .join(" + ");
    case "Custom":
      return comp.notes ?? "Custom terms";
  }
}

/* ------------------------------------------------------------------ */
/* Lifecycle: Pending → Approved → Locked → Payable → Paid | Reversed  */
/* ------------------------------------------------------------------ */

export function paymentNetDays(terms: PaymentTerms, customDays = 30): number {
  switch (terms) {
    case "net15":
      return 15;
    case "net30":
      return 30;
    case "net45":
      return 45;
    case "custom":
      return customDays;
  }
}

/** First instant of the month following `iso` (UTC): the billing-cycle boundary. */
function startOfNextMonth(iso: string) {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}

const plusDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * DAY_MS).toISOString();

export interface LifecycleSchedule {
  approvedAt: string;
  lockedAt: string;
  payableAt: string;
}

/**
 * Pending until the returns period ends (Approved), then a locking period during
 * which the amount is still open to adjustment, after which it is Locked and joins
 * the next monthly billing cycle (Payable).
 */
export function lifecycleSchedule(
  transaction: Pick<Transaction, "date" | "approvedAt">,
  rules: Pick<TransactionRules, "returnsPeriodDays" | "lockingPeriodDays">,
): LifecycleSchedule {
  const approvedAt = transaction.approvedAt ?? plusDays(transaction.date, rules.returnsPeriodDays);
  const lockedAt = plusDays(approvedAt, rules.lockingPeriodDays);
  return { approvedAt, lockedAt, payableAt: startOfNextMonth(lockedAt) };
}

export function paymentDueDate(payableAt: string, terms: PaymentTerms, customDays?: number) {
  return plusDays(payableAt, paymentNetDays(terms, customDays));
}

export function deriveStatus(
  tx: Pick<Transaction, "date" | "status" | "paidAt" | "approvedAt">,
  rules: Pick<TransactionRules, "returnsPeriodDays" | "lockingPeriodDays">,
  now: string,
): TransactionStatus {
  if (tx.status === "Reversed") return "Reversed";
  if (tx.paidAt || tx.status === "Paid") return "Paid";
  const s = lifecycleSchedule(tx, rules);
  const t = new Date(now).getTime();
  if (t >= new Date(s.payableAt).getTime()) return "Payable";
  if (t >= new Date(s.lockedAt).getTime()) return "Locked";
  if (t >= new Date(s.approvedAt).getTime()) return "Approved";
  return "Pending";
}

/* ------------------------------------------------------------------ */
/* Returns & cancellations                                             */
/* ------------------------------------------------------------------ */

export interface ReversalResult {
  transaction: Transaction;
  /** Present when the commission was already paid: a clawback to net off the next payout. */
  adjustment?: Omit<Adjustment, "id" | "createdAt">;
}

export function reverseTransaction(tx: Transaction, reason: string): ReversalResult {
  if (tx.status === "Reversed") return { transaction: tx };
  if (tx.status === "Paid") {
    // Never rewrite history on money that already moved; record a negative adjustment instead.
    return {
      transaction: { ...tx, reversedReason: reason },
      adjustment: {
        partnershipId: tx.partnershipId,
        promoterId: tx.promoterId,
        payerId: tx.payerId,
        label: `Clawback: order ${tx.orderId} (${reason})`,
        amountCents: -tx.commissionCents,
      },
    };
  }
  return { transaction: { ...tx, status: "Reversed", commissionCents: 0, reversedReason: reason } };
}

/** Partial return: shrink the commission in proportion to the refunded revenue. */
export function applyPartialReturn(tx: Transaction, returnedRevenueCents: number): Transaction {
  if (tx.saleCents <= 0 || returnedRevenueCents <= 0) return tx;
  if (returnedRevenueCents >= tx.saleCents) return reverseTransaction(tx, "Full return").transaction;
  const keep = (tx.saleCents - returnedRevenueCents) / tx.saleCents;
  return { ...tx, saleCents: tx.saleCents - returnedRevenueCents, commissionCents: Math.round(tx.commissionCents * keep) };
}

/* ------------------------------------------------------------------ */
/* Payout statements                                                   */
/* ------------------------------------------------------------------ */

export interface Statement {
  commissionCents: number;
  flatFeeCents: number;
  adjustmentCents: number;
  totalCents: number;
  transactionCount: number;
}

/** Everything the paying brand owes the promoting brand for a period. */
export function buildStatement(input: {
  transactions: Pick<Transaction, "status" | "commissionCents">[];
  flatFees?: Pick<FlatFee, "status" | "amountCents">[];
  adjustments?: Pick<Adjustment, "amountCents">[];
}): Statement {
  const payable = input.transactions.filter((t) => t.status === "Payable");
  const commissionCents = payable.reduce((s, t) => s + t.commissionCents, 0);
  const flatFeeCents = (input.flatFees ?? []).filter((f) => f.status === "Payable").reduce((s, f) => s + f.amountCents, 0);
  const adjustmentCents = (input.adjustments ?? []).reduce((s, a) => s + a.amountCents, 0);
  return {
    commissionCents,
    flatFeeCents,
    adjustmentCents,
    totalCents: commissionCents + flatFeeCents + adjustmentCents,
    transactionCount: payable.length,
  };
}
