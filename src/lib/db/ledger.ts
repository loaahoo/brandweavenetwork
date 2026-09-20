/**
 * Money pipeline, backed by Postgres: clicks → conversions → transactions → payouts.
 * Read models are scoped to an organization id, like everything tenant-owned.
 */
import { createHash } from "node:crypto";
import { attributeConversion, type ConversionOutcome } from "../conversions";
import { TEAM } from "../data/ledger";
import { newClickId, newId, newLinkCode } from "../tracking";
import type { Adjustment, ConversionEvent, FlatFee, LinkKind, Payout, TrackingLink, Transaction } from "../types";
import { db } from "./client";
import {
  agreementSelect,
  linkKind,
  toAdjustment,
  toDirection,
  toFlatFee,
  toLink,
  toPayout,
  toTransaction,
  transactionInclude,
  type TransactionRow,
} from "./mappers";

const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === "P2002";
const nowIso = () => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* API keys                                                             */
/* ------------------------------------------------------------------ */

export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** Resolve a presented API key to the organization it belongs to (revoked keys never match). */
export async function organizationForApiKey(key: string): Promise<string | null> {
  if (!key || key.length > 200) return null;
  const row = await db().apiKey.findFirst({ where: { hash: hashApiKey(key), revokedAt: null }, select: { id: true, organizationId: true } });
  if (!row) return null;
  // Best-effort usage stamp; never fail the request over it.
  db().apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return row.organizationId;
}

/* ------------------------------------------------------------------ */
/* Clicks                                                               */
/* ------------------------------------------------------------------ */

export async function recordClick(code: string, meta: { country?: string; userAgent?: string }) {
  const link = await db().trackingLink.findUnique({ where: { code }, select: { id: true, destination: true, archivedAt: true } });
  if (!link || link.archivedAt) return null;
  const clickId = newClickId();
  await db().click.create({ data: { id: clickId, linkId: link.id, country: meta.country, userAgent: meta.userAgent } });
  return { clickId, destination: link.destination };
}

/* ------------------------------------------------------------------ */
/* Conversions                                                          */
/* ------------------------------------------------------------------ */

async function readTransaction(id: string): Promise<Transaction> {
  const row = await db().transaction.findUniqueOrThrow({ where: { id }, include: transactionInclude });
  return toTransaction(row as unknown as TransactionRow, nowIso());
}

/**
 * @param reportingBrandId the organization that authenticated the request.
 * Only the paying brand can report sales for a click; each (payer, order) is recorded once.
 */
export async function processConversion(event: ConversionEvent, reportingBrandId: string): Promise<ConversionOutcome> {
  const p = db();
  const click = await p.click.findUnique({
    where: { id: event.clickId },
    select: {
      occurredAt: true,
      link: { select: { id: true, payerOrganizationId: true, agreementId: true, partnershipId: true, agreement: { select: agreementSelect } } },
    },
  });
  if (!click) return { kind: "unknown_click" };
  if (click.link.payerOrganizationId !== reportingBrandId) return { kind: "forbidden" };

  const replay = async (): Promise<ConversionOutcome | null> => {
    const existing = await p.conversion.findUnique({
      where: { payerOrganizationId_orderId: { payerOrganizationId: reportingBrandId, orderId: event.orderId } },
      select: { rejectionReasons: true, transaction: { select: { id: true } } },
    });
    if (!existing) return null;
    return existing.transaction
      ? { kind: "duplicate", transaction: await readTransaction(existing.transaction.id) }
      : { kind: "unattributed", reasons: existing.rejectionReasons };
  };

  const already = await replay();
  if (already) return already;

  const prior = await p.transaction.aggregate({ where: { agreementId: click.link.agreementId, status: { not: "REVERSED" } }, _sum: { saleCents: true } });
  const decision = attributeConversion(toDirection(click.link.agreement), click.occurredAt.toISOString(), event, Number(prior._sum.saleCents ?? 0));

  const conversionData = {
    id: newId("cnv"),
    payerOrganizationId: reportingBrandId,
    orderId: event.orderId,
    clickId: event.clickId,
    revenueCents: BigInt(event.revenueCents),
    currency: event.currency,
    customerType: event.customerType,
    country: event.country,
    items: event.items as never,
    source: (event.source === "pixel" ? "PIXEL" : "API") as never,
    occurredAt: new Date(event.timestamp),
  };

  try {
    if (!decision.eligible) {
      await p.conversion.create({ data: { ...conversionData, attributed: false, rejectionReasons: decision.reasons } });
      return { kind: "unattributed", reasons: decision.reasons };
    }
    const txId = newId("txn");
    await p.$transaction([
      p.conversion.create({ data: { ...conversionData, attributed: true, rejectionReasons: [] } }),
      p.transaction.create({
        data: {
          id: txId,
          partnershipId: click.link.partnershipId,
          agreementId: click.link.agreementId,
          conversionId: conversionData.id,
          saleCents: BigInt(event.revenueCents),
          commissionCents: BigInt(decision.commissionCents),
          currency: event.currency,
          status: "PENDING",
          occurredAt: new Date(event.timestamp),
        },
      }),
    ]);
    return { kind: "created", transaction: await readTransaction(txId) };
  } catch (e) {
    // Two requests for the same order raced: the unique (payer, order) constraint decided the winner.
    if (isUniqueViolation(e)) {
      const raced = await replay();
      if (raced) return raced;
    }
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Read models                                                          */
/* ------------------------------------------------------------------ */

const involving = (brandId: string) => ({ OR: [{ promoterOrganizationId: brandId }, { payerOrganizationId: brandId }] });

export async function listTransactions(brandId: string, opts: { partnershipId?: string; since?: Date } = {}): Promise<Transaction[]> {
  const rows = await db().transaction.findMany({
    where: {
      agreement: involving(brandId),
      ...(opts.partnershipId ? { partnershipId: opts.partnershipId } : {}),
      ...(opts.since ? { occurredAt: { gte: opts.since } } : {}),
    },
    orderBy: { occurredAt: "desc" },
    include: transactionInclude,
  });
  const now = nowIso();
  return rows.map((r) => toTransaction(r as unknown as TransactionRow, now));
}

export async function listLinks(brandId: string, opts: { partnershipId?: string } = {}): Promise<TrackingLink[]> {
  const rows = await db().trackingLink.findMany({
    where: { ...involving(brandId), ...(opts.partnershipId ? { partnershipId: opts.partnershipId } : {}) },
    orderBy: { createdAt: "desc" },
    include: { campaign: { select: { name: true } }, channel: { select: { name: true } }, _count: { select: { clicks: true } } },
  });
  if (rows.length === 0) return [];
  const agg = await db().$queryRaw<{ linkId: string; conversions: bigint; revenue: bigint }[]>`
    SELECT c."linkId" AS "linkId", count(*) AS conversions, coalesce(sum(t."saleCents"), 0) AS revenue
    FROM "Transaction" t
    JOIN "Conversion" cv ON cv.id = t."conversionId"
    JOIN "Click" c ON c.id = cv."clickId"
    WHERE t.status <> 'REVERSED' AND c."linkId" = ANY(${rows.map((r) => r.id)})
    GROUP BY c."linkId"`;
  const byLink = new Map(agg.map((a) => [a.linkId, { conversions: Number(a.conversions), revenueCents: Number(a.revenue) }]));
  return rows.map((l) => toLink({ ...l, createdBy: TEAM.find((m) => m.id === l.createdById)?.name ?? null }, byLink.get(l.id)));
}

export async function listPayouts(brandId: string): Promise<Payout[]> {
  const rows = await db().payout.findMany({
    where: involving(brandId),
    orderBy: { dueDate: "desc" },
    include: { _count: { select: { transactions: { where: { status: { not: "REVERSED" } } } } } },
  });
  return rows.map(toPayout);
}

export async function listFlatFees(brandId: string): Promise<FlatFee[]> {
  const rows = await db().flatFee.findMany({
    where: { agreement: involving(brandId) },
    orderBy: { dueDate: "asc" },
    include: { agreement: { select: { promoterOrganizationId: true, payerOrganizationId: true } } },
  });
  return rows.map(toFlatFee);
}

export async function listAdjustments(brandId: string): Promise<Adjustment[]> {
  const rows = await db().adjustment.findMany({ where: involving(brandId), orderBy: { createdAt: "desc" } });
  return rows.map(toAdjustment);
}

export async function countClicks(brandId: string): Promise<number> {
  return db().click.count({ where: { link: involving(brandId) } });
}

/* ------------------------------------------------------------------ */
/* Tracking links                                                       */
/* ------------------------------------------------------------------ */

export type CreateLinkResult = { ok: true; code: string } | { ok: false; error: string };

export async function createTrackingLink(input: {
  agreementId: string;
  promoterId: string;
  campaignName: string;
  channelId?: string;
  placement: string;
  creative?: string;
  kind: LinkKind;
  destination: string;
  createdById?: string;
  /** Called with the payer's id so the caller can enforce that the destination is on the payer's own domain. */
  validateDestination: (payerId: string) => string | null;
}): Promise<CreateLinkResult> {
  const p = db();
  const agreement = await p.agreement.findUnique({
    where: { id: input.agreementId },
    select: { id: true, partnershipId: true, promoterOrganizationId: true, payerOrganizationId: true, endedAt: true, channels: { select: { channelId: true } } },
  });
  if (!agreement || agreement.endedAt) return { ok: false, error: "Terms for this direction haven't been finalised yet." };
  // Only the promoting brand of an agreement can mint links for it.
  if (agreement.promoterOrganizationId !== input.promoterId) return { ok: false, error: "You can only create links for channels you contribute." };
  const destinationError = input.validateDestination(agreement.payerOrganizationId);
  if (destinationError) return { ok: false, error: destinationError };
  if (input.channelId && !agreement.channels.some((c) => c.channelId === input.channelId)) {
    return { ok: false, error: "That channel isn't part of this agreement." };
  }

  const campaign = await p.campaign.upsert({
    where: { partnershipId_name: { partnershipId: agreement.partnershipId, name: input.campaignName } },
    create: { partnershipId: agreement.partnershipId, name: input.campaignName, status: "LIVE" },
    update: {},
  });

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newLinkCode();
    try {
      await p.trackingLink.create({
        data: {
          id: `lnk_${code}`,
          code,
          partnershipId: agreement.partnershipId,
          agreementId: agreement.id,
          promoterOrganizationId: agreement.promoterOrganizationId,
          payerOrganizationId: agreement.payerOrganizationId,
          campaignId: campaign.id,
          channelId: input.channelId,
          placement: input.placement,
          creative: input.creative,
          kind: linkKind.db(input.kind) as never,
          destination: input.destination,
          createdById: input.createdById,
        },
      });
      return { ok: true, code };
    } catch (e) {
      if (!isUniqueViolation(e)) throw e; // a code collision: try another
    }
  }
  return { ok: false, error: "Couldn't allocate a link code. Please try again." };
}
