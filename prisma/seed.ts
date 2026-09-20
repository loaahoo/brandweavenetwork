/**
 * Seeds the demo network into Postgres: organizations, agreements, and the money ledger
 * (links, clicks, conversions, transactions, payouts). Stable string ids from src/lib/data are reused
 * so the UI keeps working unchanged.
 *
 *   npm run db:seed            # refuses if the database already has organizations
 *   npm run db:seed -- --reset # wipes the seeded tables first
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { BRANDS } from "../src/lib/data/brands";
import { CHANNELS } from "../src/lib/data/channels";
import {
  ASSETS,
  SEED_ADJUSTMENTS,
  SEED_FLAT_FEES,
  SEED_LINKS,
  SEED_PAYOUTS,
  SEED_TRANSACTIONS,
  TEAM,
} from "../src/lib/data/ledger";
import { PARTNERSHIPS } from "../src/lib/data/partnerships";
import { seeded, DEMO_NOW } from "../src/lib/utils";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

/** "Social & Content" → SOCIAL_CONTENT, "Mid-market" → MID_MARKET, "last_click" → LAST_CLICK */
const E = (s: string) => s.toUpperCase().replace(/[ &-]+/g, "_");
const D = (iso: string | undefined) => (iso ? new Date(iso) : undefined);
const chunk = <T,>(rows: T[], n = 1000) => Array.from({ length: Math.ceil(rows.length / n) }, (_, i) => rows.slice(i * n, (i + 1) * n));

const TABLES = [
  "Notification", "ApiKey", "Integration", "Asset", "Adjustment", "Transaction", "Conversion", "Click", "TrackingLink",
  "Campaign", "FlatFee", "Payout", "CommissionRule", "AgreementChannel", "Agreement", "Proposal", "Message", "Conversation",
  "PartnershipMember", "ConnectionRequest", "Partnership", "Opportunity", "MarketingChannel", "BrandProfile", "BrandUser", "Organization", "User",
];

async function main() {
  const existing = await prisma.organization.count();
  if (existing > 0) {
    if (!process.argv.includes("--reset")) {
      console.error(`Refusing to seed: ${existing} organizations already exist. Re-run with --reset to wipe seeded tables.`);
      process.exit(1);
    }
    console.log("Resetting…");
    await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  }

  /* Organizations + profiles */
  await prisma.organization.createMany({ data: BRANDS.map((b) => ({ id: b.id, slug: b.slug, name: b.name })) });
  await prisma.brandProfile.createMany({
    data: BRANDS.map((b) => ({
      organizationId: b.id,
      tagline: b.tagline,
      website: b.website,
      industry: b.industry,
      subcategory: b.subcategory,
      headquarters: b.headquarters,
      markets: b.markets,
      description: b.description,
      productCategories: b.productCategories,
      averageOrderValueCents: BigInt(b.averageOrderValueCents),
      businessModel: b.businessModel,
      businessType: E(b.businessType) as never,
      presence: E(b.presence) as never,
      size: E(b.size) as never,
      lifecycleStages: b.lifecycleStages,
      lookingFor: b.lookingFor,
      partnershipModels: b.partnershipModels.map(E) as never,
      verified: b.verified,
      primaryAudience: b.audience.primary,
      ageRanges: b.audience.ageRanges,
      audienceGeography: b.audience.geography,
      interests: b.audience.interests,
      segments: b.audience.segments,
      householdIncome: b.audience.householdIncome,
      customerType: b.audience.customerType,
      purchaseBehavior: b.audience.purchaseBehavior,
      loyaltyMembers: b.audience.loyaltyMembers,
      monthlyCustomers: b.audience.monthlyCustomers,
      monthlyTraffic: b.audience.monthlyTraffic,
      appUsers: b.audience.appUsers,
      emailSubscribers: b.audience.emailSubscribers,
      socialFollowing: b.audience.socialFollowing,
    })),
  });
  await prisma.brandUser.createMany({
    data: TEAM.map((m) => ({ id: m.id, organizationId: "lumen", email: m.email, role: E(m.role) as never, status: E(m.status) as never })),
  });
  await prisma.asset.createMany({
    data: ASSETS.map((a) => ({ id: a.id, organizationId: a.brandId, name: a.name, kind: E(a.kind) as never, detail: a.detail, approved: a.approved })),
  });

  /* Channels */
  await prisma.marketingChannel.createMany({
    data: CHANNELS.map((c) => ({
      id: c.id,
      organizationId: c.brandId,
      name: c.name,
      category: E(c.category) as never,
      description: c.description,
      monthlyReach: c.monthlyReach,
      geography: c.geography,
      segment: c.segment,
      placementExamples: c.placements,
      partnershipTypes: c.partnershipTypes.map(E) as never,
      compensationPreference: c.compensationPreference,
      minimumCommitment: c.minimumCommitment,
      restrictions: c.restrictions,
      approvalRequired: c.approvalRequired,
      status: E(c.status) as never,
      desiredPartnerCategories: c.desiredPartnerCategories,
    })),
  });

  /* Partnerships, agreements, terms */
  for (const p of PARTNERSHIPS) {
    await prisma.partnership.create({
      data: {
        id: p.id,
        name: p.name,
        stage: E(p.stage) as never,
        summary: p.summary,
        nextStep: p.nextStep,
        proposalStatus: E(p.proposalStatus) as never,
        createdAt: new Date(p.createdAt),
        members: { create: [{ organizationId: p.brandAId, ownerName: p.owner }, { organizationId: p.brandBId }] },
        conversation: { create: {} },
      },
    });
    for (const d of p.directions) {
      const c = d.compensation;
      await prisma.agreement.create({
        data: {
          id: d.id,
          partnershipId: p.id,
          promoterOrganizationId: d.promoterId,
          payerOrganizationId: d.payerId,
          currency: d.currency,
          attributionWindowDays: d.attribution.windowDays,
          attributionMethod: E(d.attribution.method) as never,
          clickAttribution: d.attribution.clickAttribution,
          promoCodeAttribution: d.attribution.promoCodeAttribution,
          eligibleProducts: d.rules.eligibleProducts,
          excludedSkus: d.rules.excludedSkus,
          customerRule: E(d.rules.customers) as never,
          geoRestrictions: d.rules.geoRestrictions,
          returnsPeriodDays: d.rules.returnsPeriodDays,
          lockingPeriodDays: d.rules.lockingPeriodDays,
          paymentTerms: E(d.paymentTerms) as never,
          customPaymentDays: d.customPaymentDays,
          effectiveFrom: new Date(p.createdAt),
          channels: { create: d.channelIds.map((channelId) => ({ channelId })) },
          commissionRules: {
            create: [
              {
                model: E(c.model) as never,
                commissionBps: c.commissionBps,
                cpaCents: c.cpaCents !== undefined ? BigInt(c.cpaCents) : undefined,
                cplCents: c.cplCents !== undefined ? BigInt(c.cplCents) : undefined,
                cpcCents: c.cpcCents !== undefined ? BigInt(c.cpcCents) : undefined,
                flatFeeCents: c.flatFeeCents !== undefined ? BigInt(c.flatFeeCents) : undefined,
                flatFeeLabel: c.flatFeeLabel,
                notes: c.notes,
              },
            ],
          },
        },
      });
    }
  }
  await prisma.flatFee.createMany({
    data: SEED_FLAT_FEES.map((f) => ({
      id: f.id, partnershipId: f.partnershipId, agreementId: f.directionId, label: f.label,
      amountCents: BigInt(f.amountCents), dueDate: new Date(f.dueDate), status: E(f.status) as never,
    })),
  });

  /* Campaigns + links */
  const campaigns = new Map<string, string>();
  for (const l of SEED_LINKS) {
    const key = `${l.partnershipId}|${l.campaignName}`;
    if (!campaigns.has(key)) {
      const c = await prisma.campaign.create({ data: { partnershipId: l.partnershipId, name: l.campaignName, status: "LIVE" } });
      campaigns.set(key, c.id);
    }
  }
  const userIdByName = new Map(TEAM.map((m) => [m.name, m.id]));
  await prisma.trackingLink.createMany({
    data: SEED_LINKS.map((l) => ({
      id: l.id, code: l.code, partnershipId: l.partnershipId, agreementId: l.directionId,
      promoterOrganizationId: l.promoterId, payerOrganizationId: l.payerId,
      campaignId: campaigns.get(`${l.partnershipId}|${l.campaignName}`)!,
      channelId: l.channelId, placement: l.placement, creative: l.creative,
      kind: E(l.kind) as never, destination: l.destination,
      createdById: userIdByName.get(l.createdBy), createdAt: new Date(l.createdAt),
    })),
  });

  /* Clicks: one per seeded sale, plus filler so link click totals match the demo numbers. */
  const rnd = seeded(7);
  const clicks: { id: string; linkId: string; occurredAt: Date; country: string }[] = [];
  const countries = ["US", "US", "US", "CA", "GB"];
  for (const l of SEED_LINKS) {
    const sales = SEED_TRANSACTIONS.filter((t) => t.linkId === l.id);
    const start = new Date(l.createdAt).getTime();
    const end = new Date(DEMO_NOW).getTime();
    for (const t of sales) {
      const at = Math.max(start, new Date(t.date).getTime() - 86_400_000);
      clicks.push({ id: t.clickId!, linkId: l.id, occurredAt: new Date(at), country: t.country ?? "US" });
    }
    for (let i = 0; i < Math.max(0, l.clicks - sales.length); i++) {
      clicks.push({ id: `clk_f${l.code}${i}`, linkId: l.id, occurredAt: new Date(start + rnd() * (end - start)), country: countries[Math.floor(rnd() * countries.length)]! });
    }
  }
  for (const rows of chunk(clicks)) await prisma.click.createMany({ data: rows });

  /* Payouts, then conversions + transactions */
  await prisma.payout.createMany({
    data: SEED_PAYOUTS.map((p) => ({
      id: p.id, partnershipId: p.partnershipId, promoterOrganizationId: p.promoterId, payerOrganizationId: p.payerId,
      period: p.period, dueDate: new Date(p.dueDate), status: E(p.status) as never,
      commissionCents: BigInt(p.commissionCents), flatFeeCents: BigInt(p.flatFeeCents), adjustmentCents: BigInt(p.adjustmentCents), currency: p.currency,
    })),
  });
  const payoutIds = new Set(SEED_PAYOUTS.map((p) => p.id));

  await prisma.conversion.createMany({
    data: SEED_TRANSACTIONS.map((t) => ({
      id: `cnv_${t.id}`, payerOrganizationId: t.payerId, orderId: t.orderId, clickId: t.clickId,
      revenueCents: BigInt(t.saleCents), currency: t.currency, customerType: t.customerType, country: t.country,
      source: E(t.source) as never, occurredAt: new Date(t.date), attributed: true, rejectionReasons: [],
    })),
  });
  await prisma.transaction.createMany({
    data: SEED_TRANSACTIONS.map((t) => {
      const po = `po_${t.directionId}_${t.date.slice(0, 7)}`;
      return {
        id: t.id, partnershipId: t.partnershipId, agreementId: t.directionId, conversionId: `cnv_${t.id}`,
        payoutId: payoutIds.has(po) ? po : undefined,
        saleCents: BigInt(t.saleCents), commissionCents: BigInt(t.commissionCents), currency: t.currency,
        status: E(t.status) as never, reversedReason: t.reversedReason, occurredAt: new Date(t.date),
        approvedAt: D(t.approvedAt), lockedAt: D(t.lockedAt), payableAt: D(t.payableAt), paidAt: D(t.paidAt),
      };
    }),
  });
  await prisma.adjustment.createMany({
    data: SEED_ADJUSTMENTS.map((a) => ({
      id: a.id, partnershipId: a.partnershipId, label: a.label, amountCents: BigInt(a.amountCents),
      promoterOrganizationId: a.promoterId, payerOrganizationId: a.payerId, createdAt: new Date(a.createdAt),
    })),
  });

  /* Sandbox API keys (bw_test_<brand>_demo). Stored hashed, like real keys. */
  await prisma.apiKey.createMany({
    data: BRANDS.map((b) => {
      const key = `bw_test_${b.id}_demo`;
      return { organizationId: b.id, prefix: key.slice(0, 12), hash: createHash("sha256").update(key).digest("hex"), label: "Sandbox key" };
    }),
  });

  const counts = {
    organizations: await prisma.organization.count(),
    agreements: await prisma.agreement.count(),
    links: await prisma.trackingLink.count(),
    clicks: await prisma.click.count(),
    conversions: await prisma.conversion.count(),
    transactions: await prisma.transaction.count(),
    payouts: await prisma.payout.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
