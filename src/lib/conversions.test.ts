import { describe, expect, it } from "vitest";
import { attributeConversion, parseConversion } from "./conversions";
import { normalizeDestination, newClickId, newLinkCode, withClickId } from "./tracking";
import type { DealDirection } from "./types";

const NOW = new Date("2026-09-19T15:00:00.000Z");
const CLICK_AT = "2026-09-18T12:00:00.000Z";

/** The Voyago → Lumen agreement: Hybrid, 12% commission, 30-day window, gift cards excluded. */
const direction: Pick<DealDirection, "attribution" | "rules" | "currency" | "compensation"> = {
  currency: "USD",
  compensation: { model: "Hybrid", flatFeeCents: 1_000_000, commissionBps: 1200 },
  attribution: { windowDays: 30, method: "last_click", clickAttribution: true, promoCodeAttribution: false },
  rules: { eligibleProducts: [], excludedSkus: ["GIFTCARD"], customers: "all", geoRestrictions: [], returnsPeriodDays: 30, lockingPeriodDays: 15 },
};

const event = (over: Record<string, unknown> = {}) => {
  const parsed = parseConversion({ order_id: "T-1", click_id: "clk_abc", revenue: 349, currency: "USD", customer_type: "new", country: "US", timestamp: "2026-09-19T12:00:00.000Z", ...over }, "api", NOW);
  if (!parsed.ok) throw new Error(parsed.errors.join("; "));
  return parsed.event;
};

describe("parseConversion", () => {
  it("converts decimal revenue to integer cents without float drift", () => {
    const r = parseConversion({ order_id: "1", click_id: "clk_abc", revenue: 19.99 }, "api", NOW);
    expect(r.ok && r.event.revenueCents).toBe(1999);
    const r2 = parseConversion({ order_id: "1", click_id: "clk_abc", revenue: "0.1" }, "pixel", NOW);
    expect(r2.ok && r2.event.revenueCents).toBe(10);
  });

  it("rejects malformed input with every problem listed", () => {
    const r = parseConversion({ order_id: "", click_id: "nope", revenue: -1, currency: "XXX", customer_type: "vip" }, "api", NOW);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors).toHaveLength(5);
  });

  it("rejects future timestamps and absurd revenue", () => {
    expect(parseConversion({ order_id: "1", click_id: "clk_a", revenue: 1, timestamp: "2027-01-01T00:00:00Z" }, "api", NOW).ok).toBe(false);
    expect(parseConversion({ order_id: "1", click_id: "clk_a", revenue: 1e12 }, "api", NOW).ok).toBe(false);
  });

  it("validates line items", () => {
    expect(parseConversion({ order_id: "1", click_id: "clk_a", revenue: 1, items: [{ sku: "A", price: 1, quantity: 0 }] }, "api", NOW).ok).toBe(false);
    expect(parseConversion({ order_id: "1", click_id: "clk_a", revenue: 1, items: "x" }, "api", NOW).ok).toBe(false);
  });
});

describe("attributeConversion", () => {
  it("attributes an in-window sale and computes the agreed commission (12% of $349)", () => {
    expect(attributeConversion(direction, CLICK_AT, event())).toEqual({ eligible: true, eligibleRevenueCents: 34_900, commissionCents: 4_188 });
  });

  it("does not attribute a sale outside the attribution window", () => {
    const r = attributeConversion(direction, "2026-06-01T00:00:00.000Z", event());
    expect(r.eligible).toBe(false);
    expect(!r.eligible && r.reasons[0]).toMatch(/attribution window/);
  });

  it("excludes gift cards from commissionable revenue", () => {
    const r = attributeConversion(direction, CLICK_AT, event({ revenue: 200, items: [{ sku: "GLASSES", price: 150, quantity: 1 }, { sku: "GIFTCARD", price: 50, quantity: 1 }] }));
    expect(r.eligible && r.commissionCents).toBe(1_800); // 12% of $150
  });

  it("is not attributable when every item is excluded", () => {
    expect(attributeConversion(direction, CLICK_AT, event({ revenue: 50, items: [{ sku: "GIFTCARD", price: 50, quantity: 1 }] })).eligible).toBe(false);
  });

  it("enforces new-customer-only agreements", () => {
    const d = { ...direction, rules: { ...direction.rules, customers: "new_only" as const } };
    expect(attributeConversion(d, CLICK_AT, event({ customer_type: "existing" })).eligible).toBe(false);
    expect(attributeConversion(d, CLICK_AT, event({ customer_type: "new" })).eligible).toBe(true);
  });

  it("uses cumulative revenue for tiered terms", () => {
    const d = { ...direction, compensation: { model: "Custom" as const, tiers: [{ upToCents: 100_000, bps: 1000 }, { upToCents: null, bps: 2000 }] } };
    // Prior $900 + this $349: $100 @10% + $249 @20%.
    const r = attributeConversion(d, CLICK_AT, event(), 90_000);
    expect(r.eligible && r.commissionCents).toBe(1_000 + 4_980);
  });
});

describe("tracking primitives", () => {
  it("generates unique, well-formed ids", () => {
    const clicks = new Set(Array.from({ length: 500 }, newClickId));
    expect(clicks.size).toBe(500);
    expect([...clicks].every((c) => /^clk_[A-Za-z0-9]{24}$/.test(c))).toBe(true);
    expect(newLinkCode()).toMatch(/^[2-9A-HJ-NP-Za-km-z]{7}$/);
  });

  it("normalizes destinations and rejects unusable ones", () => {
    expect(normalizeDestination("meta.com/ai-glasses")).toBe("https://meta.com/ai-glasses");
    expect(normalizeDestination("javascript:alert(1)")).toBeNull();
    expect(normalizeDestination("ftp://x.com")).toBeNull();
    expect(normalizeDestination("localhost")).toBeNull();
    expect(normalizeDestination("   ")).toBeNull();
  });

  it("appends the click id while preserving existing query params", () => {
    expect(withClickId("https://a.example/p?x=1", "clk_1")).toBe("https://a.example/p?x=1&bw_click_id=clk_1");
  });
});
