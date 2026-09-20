import { describe, expect, it } from "vitest";
import {
  applyPartialReturn,
  buildStatement,
  computeSaleCommission,
  deriveStatus,
  describeCompensation,
  evaluateEligibility,
  lifecycleSchedule,
  paymentDueDate,
  reverseTransaction,
} from "./commission";
import type { ConversionEvent, DealDirection, Transaction } from "./types";

const direction: Pick<DealDirection, "attribution" | "rules" | "currency"> = {
  currency: "USD",
  attribution: { windowDays: 30, method: "last_click", clickAttribution: true, promoCodeAttribution: false },
  rules: {
    eligibleProducts: [],
    excludedSkus: ["GIFTCARD"],
    customers: "all",
    geoRestrictions: [],
    returnsPeriodDays: 30,
    lockingPeriodDays: 15,
  },
};

const conv = (over: Partial<ConversionEvent> = {}): ConversionEvent => ({
  orderId: "ORD-1",
  clickId: "clk_1",
  revenueCents: 20_000,
  currency: "USD",
  customerType: "new",
  timestamp: "2026-09-10T00:00:00.000Z",
  source: "api",
  ...over,
});

const CLICK = "2026-09-01T00:00:00.000Z";

describe("evaluateEligibility", () => {
  it("accepts a conversion inside the window", () => {
    const r = evaluateEligibility(direction, CLICK, conv());
    expect(r).toEqual({ eligible: true, reasons: [], eligibleRevenueCents: 20_000 });
  });

  it("rejects conversions outside the attribution window", () => {
    const r = evaluateEligibility(direction, CLICK, conv({ timestamp: "2026-10-05T00:00:00.000Z" }));
    expect(r.eligible).toBe(false);
    expect(r.reasons[0]).toMatch(/30-day attribution window/);
    expect(r.eligibleRevenueCents).toBe(0);
  });

  it("rejects conversions that precede the click", () => {
    const r = evaluateEligibility(direction, CLICK, conv({ timestamp: "2026-08-31T00:00:00.000Z" }));
    expect(r.eligible).toBe(false);
  });

  it("enforces new-customer-only agreements", () => {
    const d = { ...direction, rules: { ...direction.rules, customers: "new_only" as const } };
    expect(evaluateEligibility(d, CLICK, conv({ customerType: "existing" })).eligible).toBe(false);
    expect(evaluateEligibility(d, CLICK, conv({ customerType: "new" })).eligible).toBe(true);
  });

  it("enforces geographic restrictions, including unknown country", () => {
    const d = { ...direction, rules: { ...direction.rules, geoRestrictions: ["US", "CA"] } };
    expect(evaluateEligibility(d, CLICK, conv({ country: "US" })).eligible).toBe(true);
    expect(evaluateEligibility(d, CLICK, conv({ country: "FR" })).eligible).toBe(false);
    expect(evaluateEligibility(d, CLICK, conv()).eligible).toBe(false);
  });

  it("rejects a currency that differs from the agreement", () => {
    expect(evaluateEligibility(direction, CLICK, conv({ currency: "EUR" })).eligible).toBe(false);
  });

  it("removes excluded SKUs and pro-rates order discounts", () => {
    // $150 of goods + $50 gift card, paid $180 after a $20 discount.
    const r = evaluateEligibility(
      direction,
      CLICK,
      conv({
        revenueCents: 18_000,
        items: [
          { sku: "GLASSES", priceCents: 15_000, quantity: 1 },
          { sku: "GIFTCARD", priceCents: 5_000, quantity: 1 },
        ],
      }),
    );
    expect(r.eligible).toBe(true);
    expect(r.eligibleRevenueCents).toBe(13_500); // 180 * 150/200
  });

  it("is ineligible when every line item is excluded", () => {
    const r = evaluateEligibility(direction, CLICK, conv({ items: [{ sku: "GIFTCARD", priceCents: 5_000, quantity: 1 }] }));
    expect(r.eligible).toBe(false);
  });

  it("restricts to eligible products when a list is set", () => {
    const d = { ...direction, rules: { ...direction.rules, eligibleProducts: ["A"] } };
    const r = evaluateEligibility(
      d,
      CLICK,
      conv({
        revenueCents: 30_000,
        items: [
          { sku: "A", priceCents: 10_000, quantity: 1 },
          { sku: "B", priceCents: 20_000, quantity: 1 },
        ],
      }),
    );
    expect(r.eligibleRevenueCents).toBe(10_000);
  });
});

describe("computeSaleCommission", () => {
  it("applies a percentage commission (15% of $200 = $30)", () => {
    expect(computeSaleCommission({ model: "Commission", commissionBps: 1500 }, 20_000)).toBe(3_000);
  });

  it("rounds to the nearest cent", () => {
    expect(computeSaleCommission({ model: "Commission", commissionBps: 1250 }, 3_333)).toBe(417); // 416.625
  });

  it("pays a fixed CPA regardless of order value", () => {
    expect(computeSaleCommission({ model: "CPA", cpaCents: 1_800 }, 5_000)).toBe(1_800);
    expect(computeSaleCommission({ model: "CPA", cpaCents: 1_800 }, 500_000)).toBe(1_800);
  });

  it("hybrid pays only the percentage per sale (flat fee is ledgered separately)", () => {
    expect(computeSaleCommission({ model: "Hybrid", flatFeeCents: 1_000_000, commissionBps: 1200 }, 10_000)).toBe(1_200);
  });

  it("flat fee, CPL and CPC produce no per-sale amount", () => {
    expect(computeSaleCommission({ model: "Flat fee", flatFeeCents: 5_000_000 }, 10_000)).toBe(0);
    expect(computeSaleCommission({ model: "CPL", cplCents: 500 }, 10_000)).toBe(0);
    expect(computeSaleCommission({ model: "CPC", cpcCents: 20 }, 10_000)).toBe(0);
  });

  it("returns 0 for non-positive revenue", () => {
    expect(computeSaleCommission({ model: "Commission", commissionBps: 1500 }, 0)).toBe(0);
  });

  it("applies marginal custom tiers across cumulative revenue", () => {
    const comp = {
      model: "Custom" as const,
      tiers: [
        { upToCents: 100_000, bps: 1000 },
        { upToCents: 500_000, bps: 1500 },
        { upToCents: null, bps: 2000 },
      ],
    };
    // Prior $900, this sale $2,000: $100 @10% + $1,900 @15%.
    expect(computeSaleCommission(comp, 200_000, 90_000)).toBe(1_000 + 28_500);
    // Entirely inside the top tier.
    expect(computeSaleCommission(comp, 100_000, 600_000)).toBe(20_000);
  });
});

describe("lifecycle", () => {
  const tx = { date: "2026-09-10T00:00:00.000Z" };

  it("schedules approval after returns, lock after locking period, payable at next month boundary", () => {
    const s = lifecycleSchedule(tx, direction.rules);
    expect(s.approvedAt).toBe("2026-10-10T00:00:00.000Z");
    expect(s.lockedAt).toBe("2026-10-25T00:00:00.000Z");
    expect(s.payableAt).toBe("2026-11-01T00:00:00.000Z");
  });

  it.each([
    ["2026-09-20T00:00:00.000Z", "Pending"],
    ["2026-10-10T00:00:00.000Z", "Approved"],
    ["2026-10-26T00:00:00.000Z", "Locked"],
    ["2026-11-01T00:00:00.000Z", "Payable"],
  ])("at %s the status is %s", (now, expected) => {
    expect(deriveStatus({ ...tx, status: "Pending" }, direction.rules, now)).toBe(expected);
  });

  it("respects a manual early approval", () => {
    const status = deriveStatus(
      { ...tx, status: "Pending", approvedAt: "2026-09-12T00:00:00.000Z" },
      direction.rules,
      "2026-09-13T00:00:00.000Z",
    );
    expect(status).toBe("Approved");
  });

  it("never moves backwards from Paid or Reversed", () => {
    expect(deriveStatus({ ...tx, status: "Paid", paidAt: "2026-11-05T00:00:00.000Z" }, direction.rules, "2026-09-11T00:00:00.000Z")).toBe("Paid");
    expect(deriveStatus({ ...tx, status: "Reversed" }, direction.rules, "2027-01-01T00:00:00.000Z")).toBe("Reversed");
  });

  it("derives due dates from payment terms", () => {
    expect(paymentDueDate("2026-11-01T00:00:00.000Z", "net30")).toBe("2026-12-01T00:00:00.000Z");
    expect(paymentDueDate("2026-11-01T00:00:00.000Z", "net15")).toBe("2026-11-16T00:00:00.000Z");
    expect(paymentDueDate("2026-11-01T00:00:00.000Z", "custom", 10)).toBe("2026-11-11T00:00:00.000Z");
  });
});

describe("returns and cancellations", () => {
  const base: Transaction = {
    id: "txn_1",
    partnershipId: "p1",
    directionId: "d1",
    promoterId: "a",
    payerId: "b",
    orderId: "ORD-9",
    date: "2026-09-10T00:00:00.000Z",
    saleCents: 20_000,
    commissionCents: 3_000,
    currency: "USD",
    status: "Approved",
    channelName: "Email",
    campaignName: "Fall",
    customerType: "new",
    source: "api",
  };

  it("zeroes the commission of an unpaid transaction", () => {
    const { transaction, adjustment } = reverseTransaction(base, "Order cancelled");
    expect(transaction.status).toBe("Reversed");
    expect(transaction.commissionCents).toBe(0);
    expect(adjustment).toBeUndefined();
  });

  it("creates a clawback adjustment instead of rewriting a paid transaction", () => {
    const { transaction, adjustment } = reverseTransaction({ ...base, status: "Paid" }, "Refunded");
    expect(transaction.status).toBe("Paid");
    expect(transaction.commissionCents).toBe(3_000);
    expect(adjustment?.amountCents).toBe(-3_000);
  });

  it("is idempotent for already-reversed transactions", () => {
    const once = reverseTransaction(base, "x").transaction;
    expect(reverseTransaction(once, "y").transaction).toBe(once);
  });

  it("scales commission on a partial return", () => {
    const t = applyPartialReturn(base, 5_000); // 25% returned
    expect(t.saleCents).toBe(15_000);
    expect(t.commissionCents).toBe(2_250);
  });

  it("treats a return of the full amount as a reversal", () => {
    expect(applyPartialReturn(base, 20_000).status).toBe("Reversed");
  });
});

describe("buildStatement", () => {
  it("matches the spec example: $50,000 flat fee + $18,420 commission = $68,420", () => {
    const s = buildStatement({
      transactions: [
        { status: "Payable", commissionCents: 1_000_000 },
        { status: "Payable", commissionCents: 842_000 },
      ],
      flatFees: [{ status: "Payable", amountCents: 5_000_000 }],
    });
    expect(s.commissionCents).toBe(1_842_000);
    expect(s.flatFeeCents).toBe(5_000_000);
    expect(s.totalCents).toBe(6_842_000);
    expect(s.transactionCount).toBe(2);
  });

  it("only counts Payable transactions and payable flat fees, and nets adjustments", () => {
    const s = buildStatement({
      transactions: [
        { status: "Payable", commissionCents: 10_000 },
        { status: "Pending", commissionCents: 99_999 },
        { status: "Reversed", commissionCents: 0 },
        { status: "Paid", commissionCents: 50_000 },
      ],
      flatFees: [
        { status: "Scheduled", amountCents: 1_000_000 },
        { status: "Payable", amountCents: 25_000 },
      ],
      adjustments: [{ amountCents: -3_000 }],
    });
    expect(s).toEqual({ commissionCents: 10_000, flatFeeCents: 25_000, adjustmentCents: -3_000, totalCents: 32_000, transactionCount: 1 });
  });
});

describe("describeCompensation", () => {
  it("formats the spec's example structures", () => {
    expect(describeCompensation({ model: "Commission", commissionBps: 1500 })).toBe("15% of approved revenue");
    expect(describeCompensation({ model: "Flat fee", flatFeeCents: 2_500_000, flatFeeLabel: "launch fee" })).toBe("$25,000 launch fee");
    expect(describeCompensation({ model: "Hybrid", flatFeeCents: 1_000_000, commissionBps: 1200 })).toBe("$10,000 flat fee + 12% commission");
  });
});
