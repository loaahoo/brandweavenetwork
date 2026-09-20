/**
 * Conversion pipeline shared by the server-side API and the tracking pixel.
 *
 *   conversion event → join to click → eligibility → commission → Transaction (Pending)
 *
 * Trust model: the *payer* (the brand whose sales these are) authenticates the
 * event. A brand can only report conversions on links where it is the payer,
 * so one brand can never mint commissions against another's agreement.
 */
import { computeSaleCommission, evaluateEligibility } from "./commission";
import { getPartnership, store } from "./store";
import { newId } from "./tracking";
import type { ConversionEvent, Currency, LineItem, Transaction } from "./types";

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

/**
 * @param reportingBrandId the brand that authenticated the request.
 */
export function processConversion(event: ConversionEvent, reportingBrandId: string): ConversionOutcome {
  const s = store();
  const click = s.clicks.find((c) => c.clickId === event.clickId);
  if (!click) return { kind: "unknown_click" };

  // Only the paying brand may report sales for this click.
  if (click.payerId !== reportingBrandId) return { kind: "forbidden" };

  // Idempotency: one transaction per (payer, order).
  const existing = s.transactions.find((t) => t.payerId === reportingBrandId && t.orderId === event.orderId);
  if (existing) return { kind: "duplicate", transaction: existing };

  const partnership = getPartnership(click.partnershipId);
  const direction = partnership?.directions.find((d) => d.id === click.directionId);
  if (!partnership || !direction) return { kind: "unknown_click" };

  const eligibility = evaluateEligibility(direction, click.timestamp, event);
  if (!eligibility.eligible) {
    s.conversions.push({ ...event, attributed: false, reasons: eligibility.reasons, payerId: reportingBrandId });
    return { kind: "unattributed", reasons: eligibility.reasons };
  }

  const prior = s.transactions
    .filter((t) => t.directionId === direction.id && t.status !== "Reversed")
    .reduce((sum, t) => sum + t.saleCents, 0);
  const commissionCents = computeSaleCommission(direction.compensation, eligibility.eligibleRevenueCents, prior);

  const link = s.links.find((l) => l.id === click.linkId);
  const transaction: Transaction = {
    id: newId("txn"),
    partnershipId: partnership.id,
    directionId: direction.id,
    promoterId: direction.promoterId,
    payerId: direction.payerId,
    orderId: event.orderId,
    clickId: event.clickId,
    linkId: click.linkId,
    date: event.timestamp,
    saleCents: event.revenueCents,
    commissionCents,
    currency: event.currency,
    status: "Pending",
    channelName: link?.channelName ?? "Direct",
    campaignName: link?.campaignName ?? "—",
    customerType: event.customerType,
    country: event.country,
    source: event.source,
  };

  s.transactions.unshift(transaction);
  s.conversions.push({ ...event, attributed: true, reasons: [], payerId: reportingBrandId });
  if (link) {
    link.conversions += 1;
    link.revenueCents += event.revenueCents;
  }
  return { kind: "created", transaction };
}
