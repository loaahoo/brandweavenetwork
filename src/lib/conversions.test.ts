import { beforeEach, describe, expect, it } from "vitest";
import { parseConversion, processConversion } from "./conversions";
import { resetStore, store } from "./store";
import { normalizeDestination, newClickId, newLinkCode, withClickId } from "./tracking";

const NOW = new Date("2026-09-19T15:00:00.000Z");

/** A click on the Voyago → Lumen booking-confirmation link (payer: lumen, 12% commission). */
function seedClick(over: Partial<ReturnType<typeof store>["clicks"][number]> = {}) {
  const clickId = newClickId();
  store().clicks.push({
    clickId,
    linkId: "lnk_Vg7Kq2A",
    code: "Vg7Kq2A",
    partnershipId: "p_voyago",
    directionId: "d_voyago_to_lumen",
    promoterId: "voyago",
    payerId: "lumen",
    placement: "Hero card",
    destination: "https://lumenlabs.example/ai-glasses",
    timestamp: "2026-09-18T12:00:00.000Z",
    ...over,
  });
  return clickId;
}

const convert = (clickId: string, over: Record<string, unknown> = {}) => {
  const parsed = parseConversion({ order_id: "T-1", click_id: clickId, revenue: 349, currency: "USD", customer_type: "new", country: "US", timestamp: "2026-09-19T12:00:00.000Z", ...over }, "api", NOW);
  if (!parsed.ok) throw new Error(parsed.errors.join("; "));
  return parsed.event;
};

beforeEach(() => resetStore());

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

describe("processConversion", () => {
  it("creates a Pending transaction with the agreed commission (12% of $349)", () => {
    const out = processConversion(convert(seedClick()), "lumen");
    expect(out.kind).toBe("created");
    if (out.kind === "created") {
      expect(out.transaction.commissionCents).toBe(4188);
      expect(out.transaction.status).toBe("Pending");
      expect(out.transaction.promoterId).toBe("voyago");
    }
  });

  it("is idempotent per (payer, order)", () => {
    const click = seedClick();
    const first = processConversion(convert(click), "lumen");
    const again = processConversion(convert(click), "lumen");
    expect(again.kind).toBe("duplicate");
    if (first.kind === "created" && again.kind === "duplicate") expect(again.transaction.id).toBe(first.transaction.id);
  });

  it("only lets the paying brand report sales for a click", () => {
    const click = seedClick();
    const before = store().transactions.length;
    expect(processConversion(convert(click), "voyago").kind).toBe("forbidden"); // the promoter can't mint its own commission
    expect(processConversion(convert(click), "stagecraft").kind).toBe("forbidden");
    expect(store().transactions.length).toBe(before);
  });

  it("returns unknown_click for a click that was never recorded", () => {
    expect(processConversion(convert("clk_neverissued"), "lumen").kind).toBe("unknown_click");
  });

  it("does not create a transaction outside the attribution window", () => {
    const click = seedClick({ timestamp: "2026-06-01T00:00:00.000Z" });
    const before = store().transactions.length;
    const out = processConversion(convert(click), "lumen");
    expect(out.kind).toBe("unattributed");
    expect(store().transactions.length).toBe(before);
  });

  it("excludes gift cards from commissionable revenue", () => {
    const click = seedClick();
    const out = processConversion(
      convert(click, { revenue: 200, items: [{ sku: "GLASSES", price: 150, quantity: 1 }, { sku: "GIFTCARD", price: 50, quantity: 1 }] }),
      "lumen",
    );
    expect(out.kind === "created" && out.transaction.commissionCents).toBe(1800); // 12% of $150
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
