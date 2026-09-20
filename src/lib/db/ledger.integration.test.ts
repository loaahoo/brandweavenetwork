/**
 * Integration test for the database-backed pipeline. It writes to the database in DATABASE_URL and cleans up
 * after itself, so it only runs when explicitly enabled:
 *
 *   BW_INTEGRATION=1 npm test
 */
import { existsSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { parseConversion } from "../conversions";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const enabled = process.env.BW_INTEGRATION === "1" && !!process.env.DATABASE_URL;
const RUN = `IT${Date.now()}`;

describe.skipIf(!enabled)("database pipeline (integration)", () => {
  const conv = (clickId: string, over: Record<string, unknown> = {}) => {
    const r = parseConversion({ order_id: `${RUN}-1`, click_id: clickId, revenue: 349, currency: "USD", customer_type: "new", country: "US", ...over }, "api");
    if (!r.ok) throw new Error(r.errors.join("; "));
    return r.event;
  };

  afterAll(async () => {
    const { db } = await import("./client");
    const p = db();
    const convs = await p.conversion.findMany({ where: { orderId: { startsWith: RUN } }, select: { id: true } });
    await p.transaction.deleteMany({ where: { conversionId: { in: convs.map((c) => c.id) } } });
    await p.conversion.deleteMany({ where: { orderId: { startsWith: RUN } } });
    await p.click.deleteMany({ where: { userAgent: RUN } });
    await p.trackingLink.deleteMany({ where: { campaignId: { in: (await p.campaign.findMany({ where: { name: RUN }, select: { id: true } })).map((c) => c.id) } } });
    await p.campaign.deleteMany({ where: { name: RUN } });
    await p.$disconnect();
  });

  it("click → conversion → Pending transaction with the agreed commission, idempotent, payer-only", async () => {
    const { recordClick, processConversion, organizationForApiKey } = await import("./ledger");

    // The sandbox key resolves to its organization; junk does not.
    expect(await organizationForApiKey("bw_test_lumen_demo")).toBe("lumen");
    expect(await organizationForApiKey("bw_test_nope")).toBeNull();

    const click = await recordClick("Vg7Kq2A", { country: "US", userAgent: RUN });
    expect(click?.destination).toBe("https://lumenlabs.example/ai-glasses");
    expect(await recordClick("ZZZZZZZ", {})).toBeNull();

    // The promoter (voyago) cannot report its own sale; the payer (lumen) can.
    expect((await processConversion(conv(click!.clickId), "voyago")).kind).toBe("forbidden");

    const first = await processConversion(conv(click!.clickId), "lumen");
    expect(first.kind).toBe("created");
    if (first.kind === "created") {
      expect(first.transaction.commissionCents).toBe(4_188); // 12% of $349
      expect(first.transaction.status).toBe("Pending");
      expect(first.transaction.promoterId).toBe("voyago");
      expect(first.transaction.channelName).toBe("Booking confirmation page");
    }

    // The same order again returns the original transaction, not a second sale.
    const again = await processConversion(conv(click!.clickId), "lumen");
    expect(again.kind).toBe("duplicate");
    if (first.kind === "created" && again.kind === "duplicate") expect(again.transaction.id).toBe(first.transaction.id);

    // Concurrent duplicates race on the (payer, order) unique constraint and still yield exactly one sale.
    const [a, b] = await Promise.all([
      processConversion(conv(click!.clickId, { order_id: `${RUN}-2` }), "lumen"),
      processConversion(conv(click!.clickId, { order_id: `${RUN}-2` }), "lumen"),
    ]);
    expect([a.kind, b.kind].sort()).toEqual(["created", "duplicate"]);

    // An unattributable order is recorded and replays as unattributed, never as a sale.
    const gift = { order_id: `${RUN}-3`, revenue: 50, items: [{ sku: "GIFTCARD", price: 50, quantity: 1 }] };
    expect((await processConversion(conv(click!.clickId, gift), "lumen")).kind).toBe("unattributed");
    expect((await processConversion(conv(click!.clickId, gift), "lumen")).kind).toBe("unattributed");

    expect((await processConversion(conv("clk_doesnotexist", { order_id: `${RUN}-4` }), "lumen")).kind).toBe("unknown_click");
  }, 60_000);

  it("creates tracking links only for the promoter, on the payer's domain, for finalised agreements", async () => {
    const { createTrackingLink, recordClick, listLinks } = await import("./ledger");
    const base = {
      agreementId: "d_lumen_to_voyago", // Lumen promotes Voyago
      promoterId: "lumen",
      campaignName: RUN,
      channelId: "ch_lumen_email",
      placement: "Test placement",
      kind: "Campaign" as const,
      destination: "https://voyago.example/experiences/test",
      validateDestination: () => null,
    };

    const ok = await createTrackingLink(base);
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.code).toMatch(/^[2-9A-HJ-NP-Za-km-z]{7}$/);
      // The new link is immediately usable and shows up in the promoter's list with its campaign and channel.
      expect((await recordClick(ok.code, { userAgent: RUN }))?.destination).toBe(base.destination);
      const mine = (await listLinks("lumen")).find((l) => l.code === ok.code);
      expect(mine?.campaignName).toBe(RUN);
      expect(mine?.channelName).toBe("Owner newsletter");
      expect(mine?.clicks).toBe(1);
    }

    // Only the promoting brand of an agreement can mint links for it.
    expect((await createTrackingLink({ ...base, promoterId: "voyago" })).ok).toBe(false);
    // A channel that isn't part of the agreement is rejected.
    expect((await createTrackingLink({ ...base, channelId: "ch_voyago_booking" })).ok).toBe(false);
    // The caller's destination policy is enforced.
    expect((await createTrackingLink({ ...base, validateDestination: () => "Destination must be on voyago.example." })).ok).toBe(false);
    // An agreement that doesn't exist yet (terms not finalised) can't have links.
    expect((await createTrackingLink({ ...base, agreementId: "d_does_not_exist" })).ok).toBe(false);
  }, 60_000);
});
