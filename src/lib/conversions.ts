/**
 * Conversion input handling shared by the server-side API and the tracking pixel.
 *
 *   parseConversion()      untrusted input → a validated ConversionEvent
 *   attributeConversion()  PURE decision: is it attributable, and what is the commission?
 *
 * The database side (joining to the click, idempotency, writing rows) lives in
 * src/lib/db/ledger.ts.
 *
 * Trust model: the *payer* (the brand whose sales these are) authenticates the
 * event. A brand can only report conversions on links where it is the payer,
 * so one brand can never mint commissions against another's agreement.
 */
import { computeSaleCommission, evaluateEligibility } from "./commission";
import type { ConversionEvent, Currency, DealDirection, LineItem, Transaction } from "./types";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CAD", "AUD"];
const MAX_REVENUE_CENTS = 100_000_000_00; // sanity cap: $100M per order

export interface ConversionInput {
  order_id?: unknown;
  click_id?: unknown;
  revenue?: unknown;
  currency?: unknown;
  customer_type?: unknown;
  country?: unknown;
  timestamp?: unknown;
  items?: unknown;
}

export type ParseResult = { ok: true; event: ConversionEvent } | { ok: false; errors: string[] };

const str = (v: unknown, max = 128) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined);

/** Validate untrusted input (JSON body or query string) into a ConversionEvent. */
export function parseConversion(input: ConversionInput, source: ConversionEvent["source"], now = new Date()): ParseResult {
  const errors: string[] = [];

  const orderId = str(input.order_id);
  if (!orderId) errors.push("order_id is required (string, max 128 chars)");

  const clickId = str(input.click_id);
  if (!clickId || !/^clk_[A-Za-z0-9]+$/.test(clickId)) errors.push("click_id is required and must look like clk_…");

  const revenueNum = typeof input.revenue === "string" ? Number(input.revenue) : input.revenue;
  let revenueCents = NaN;
  if (typeof revenueNum === "number" && Number.isFinite(revenueNum) && revenueNum >= 0) {
    revenueCents = Math.round(revenueNum * 100);
  }
  if (!Number.isFinite(revenueCents) || revenueCents > MAX_REVENUE_CENTS) {
    errors.push("revenue is required: a non-negative decimal amount in major units (e.g. 129.50)");
  }

  const currency = (input.currency ?? "USD") as string;
  if (!CURRENCIES.includes(currency as Currency)) errors.push(`currency must be one of ${CURRENCIES.join(", ")}`);

  const customerType = input.customer_type ?? "new";
  if (customerType !== "new" && customerType !== "existing") errors.push('customer_type must be "new" or "existing"');

  const country = input.country === undefined ? undefined : str(input.country, 2)?.toUpperCase();
  if (input.country !== undefined && !country) errors.push("country must be an ISO 3166-1 alpha-2 code");

  let timestamp = now.toISOString();
  if (input.timestamp !== undefined) {
    const t = typeof input.timestamp === "string" ? new Date(input.timestamp) : null;
    if (!t || Number.isNaN(t.getTime())) errors.push("timestamp must be an ISO-8601 string");
    else if (t.getTime() > now.getTime() + 5 * 60_000) errors.push("timestamp cannot be in the future");
    else timestamp = t.toISOString();
  }

  let items: LineItem[] | undefined;
  if (input.items !== undefined) {
    if (!Array.isArray(input.items) || input.items.length > 200) errors.push("items must be an array of at most 200 line items");
    else {
      items = [];
      for (const raw of input.items as Record<string, unknown>[]) {
        const sku = str(raw?.sku, 64);
        const price = typeof raw?.price === "number" ? Math.round(raw.price * 100) : NaN;
        const qty = typeof raw?.quantity === "number" ? raw.quantity : 1;
        if (!sku || !Number.isFinite(price) || price < 0 || !Number.isInteger(qty) || qty < 1) {
          errors.push("each item needs sku, price (major units) and integer quantity ≥ 1");
          break;
        }
        items.push({ sku, priceCents: price, quantity: qty });
      }
    }
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    event: {
      orderId: orderId!,
      clickId: clickId!,
      revenueCents,
      currency: currency as Currency,
      customerType: customerType as "new" | "existing",
      country,
      timestamp,
      items,
      source,
    },
  };
}

export type ConversionOutcome =
  | { kind: "created"; transaction: Transaction }
  | { kind: "duplicate"; transaction: Transaction }
  | { kind: "unattributed"; reasons: string[] }
  | { kind: "unknown_click" }
  | { kind: "forbidden" };

export type Attribution =
  | { eligible: true; eligibleRevenueCents: number; commissionCents: number }
  | { eligible: false; reasons: string[] };

/**
 * Decide whether a conversion is attributable under an agreement and what it earns.
 * `priorRevenueCents` is the agreement's cumulative eligible revenue so far (for tiered terms).
 */
export function attributeConversion(
  direction: Pick<DealDirection, "attribution" | "rules" | "currency" | "compensation">,
  clickAt: string,
  event: ConversionEvent,
  priorRevenueCents = 0,
): Attribution {
  const eligibility = evaluateEligibility(direction, clickAt, event);
  if (!eligibility.eligible) return { eligible: false, reasons: eligibility.reasons };
  return {
    eligible: true,
    eligibleRevenueCents: eligibility.eligibleRevenueCents,
    commissionCents: computeSaleCommission(direction.compensation, eligibility.eligibleRevenueCents, priorRevenueCents),
  };
}
