/**
 * Translation between database rows and the domain types in src/lib/types.ts.
 *
 * The DB uses SCREAMING_SNAKE enums; the UI and engine use human-readable strings.
 * BigInt columns (cents) are converted to number — cents stay far below 2^53.
 */
import { deriveStatus } from "../commission";
import type {
  Adjustment,
  AttributionMethod,
  CompensationModel,
  CustomerRule,
  DealDirection,
  FlatFee,
  LinkKind,
  Payout,
  PaymentTerms,
  TrackingLink,
  Transaction,
  TransactionStatus,
} from "../types";

/** "Social & Content" → SOCIAL_CONTENT, "last_click" → LAST_CLICK: the DB enum spelling of an app string. */
export const enumKey = (s: string) => s.toUpperCase().replace(/[ &-]+/g, "_");

/** Build a bidirectional map from one list of pairs. */
function pairs<D extends string, A extends string>(list: readonly (readonly [D, A])[]) {
  const toApp = new Map<string, A>(list);
  const toDb = new Map<string, D>(list.map(([d, a]) => [a, d]));
  return {
    app: (d: string) => {
      const v = toApp.get(d);
      if (!v) throw new Error(`Unmapped database value: ${d}`);
      return v;
    },
    db: (a: string) => {
      const v = toDb.get(a);
      if (!v) throw new Error(`Unmapped application value: ${a}`);
      return v;
    },
  };
}

export const compensation = pairs<string, CompensationModel>([
  ["COMMISSION", "Commission"],
  ["CPA", "CPA"],
  ["CPL", "CPL"],
  ["CPC", "CPC"],
  ["REVENUE_SHARE", "Revenue share"],
  ["FLAT_FEE", "Flat fee"],
  ["HYBRID", "Hybrid"],
  ["CUSTOM", "Custom"],
]);

export const txStatus = pairs<string, TransactionStatus>([
  ["PENDING", "Pending"],
  ["APPROVED", "Approved"],
  ["LOCKED", "Locked"],
  ["PAYABLE", "Payable"],
  ["PAID", "Paid"],
  ["REVERSED", "Reversed"],
]);

export const paymentTerms = pairs<string, PaymentTerms>([
  ["NET15", "net15"],
  ["NET30", "net30"],
  ["NET45", "net45"],
  ["CUSTOM", "custom"],
]);

export const attributionMethod = pairs<string, AttributionMethod>([
  ["LAST_CLICK", "last_click"],
  ["FIRST_CLICK", "first_click"],
  ["CUSTOM", "custom"],
]);

export const customerRule = pairs<string, CustomerRule>([
  ["NEW_ONLY", "new_only"],
  ["EXISTING_OK", "existing_ok"],
  ["ALL", "all"],
]);

export const linkKind = pairs<string, LinkKind>([
  ["STANDARD", "Standard"],
  ["CAMPAIGN", "Campaign"],
  ["PLACEMENT", "Placement"],
  ["PRODUCT", "Product"],
  ["DEEP_LINK", "Deep link"],
  ["QR_CODE", "QR code"],
]);

export const payoutStatus = pairs<string, Payout["status"]>([
  ["DRAFT", "Draft"],
  ["PAYABLE", "Payable"],
  ["PAID", "Paid"],
  ["OVERDUE", "Overdue"],
]);

export const flatFeeStatus = pairs<string, FlatFee["status"]>([
  ["SCHEDULED", "Scheduled"],
  ["PAYABLE", "Payable"],
  ["PAID", "Paid"],
]);

const num = (v: bigint | number | null | undefined) => (v === null || v === undefined ? 0 : Number(v));
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : undefined);

/* ------------------------------------------------------------------ */
/* Agreement → DealDirection                                            */
/* ------------------------------------------------------------------ */

export interface AgreementRow {
  id: string;
  promoterOrganizationId: string;
  payerOrganizationId: string;
  currency: string;
  attributionWindowDays: number;
  attributionMethod: string;
  clickAttribution: boolean;
  promoCodeAttribution: boolean;
  eligibleProducts: string[];
  excludedSkus: string[];
  customerRule: string;
  geoRestrictions: string[];
  returnsPeriodDays: number;
  lockingPeriodDays: number;
  paymentTerms: string;
  customPaymentDays: number | null;
  commissionRules: {
    model: string;
    commissionBps: number | null;
    cpaCents: bigint | null;
    cplCents: bigint | null;
    cpcCents: bigint | null;
    tierFromCents: bigint | null;
    flatFeeCents: bigint | null;
    flatFeeLabel: string | null;
    notes: string | null;
  }[];
  channels: { channelId: string }[];
}

export function toDirection(a: AgreementRow): DealDirection {
  const rule = a.commissionRules[0];
  const tiers = a.commissionRules.filter((r) => r.tierFromCents !== null);
  return {
    id: a.id,
    promoterId: a.promoterOrganizationId,
    payerId: a.payerOrganizationId,
    channelIds: a.channels.map((c) => c.channelId),
    currency: a.currency as DealDirection["currency"],
    compensation: {
      model: rule ? compensation.app(rule.model) : "Commission",
      commissionBps: rule?.commissionBps ?? undefined,
      cpaCents: rule?.cpaCents != null ? num(rule.cpaCents) : undefined,
      cplCents: rule?.cplCents != null ? num(rule.cplCents) : undefined,
      cpcCents: rule?.cpcCents != null ? num(rule.cpcCents) : undefined,
      flatFeeCents: rule?.flatFeeCents != null ? num(rule.flatFeeCents) : undefined,
      flatFeeLabel: rule?.flatFeeLabel ?? undefined,
      notes: rule?.notes ?? undefined,
      tiers: tiers.length
        ? tiers
            .sort((x, y) => num(x.tierFromCents) - num(y.tierFromCents))
            .map((t, i, all) => ({ upToCents: all[i + 1] ? num(all[i + 1]!.tierFromCents) : null, bps: t.commissionBps ?? 0 }))
        : undefined,
    },
    attribution: {
      windowDays: a.attributionWindowDays,
      method: attributionMethod.app(a.attributionMethod),
      clickAttribution: a.clickAttribution,
      promoCodeAttribution: a.promoCodeAttribution,
    },
    rules: {
      eligibleProducts: a.eligibleProducts,
      excludedSkus: a.excludedSkus,
      customers: customerRule.app(a.customerRule),
      geoRestrictions: a.geoRestrictions,
      returnsPeriodDays: a.returnsPeriodDays,
      lockingPeriodDays: a.lockingPeriodDays,
    },
    paymentTerms: paymentTerms.app(a.paymentTerms),
    customPaymentDays: a.customPaymentDays ?? undefined,
  };
}

/** Prisma `include`/`select` that yields an AgreementRow. */
export const agreementSelect = {
  id: true,
  promoterOrganizationId: true,
  payerOrganizationId: true,
  currency: true,
  attributionWindowDays: true,
  attributionMethod: true,
  clickAttribution: true,
  promoCodeAttribution: true,
  eligibleProducts: true,
  excludedSkus: true,
  customerRule: true,
  geoRestrictions: true,
  returnsPeriodDays: true,
  lockingPeriodDays: true,
  paymentTerms: true,
  customPaymentDays: true,
  commissionRules: true,
  channels: { select: { channelId: true } },
} as const;

/* ------------------------------------------------------------------ */
/* Transaction                                                          */
/* ------------------------------------------------------------------ */

export interface TransactionRow {
  id: string;
  partnershipId: string;
  agreementId: string;
  saleCents: bigint;
  commissionCents: bigint;
  currency: string;
  status: string;
  reversedReason: string | null;
  occurredAt: Date;
  approvedAt: Date | null;
  lockedAt: Date | null;
  payableAt: Date | null;
  paidAt: Date | null;
  agreement: { promoterOrganizationId: string; payerOrganizationId: string; returnsPeriodDays: number; lockingPeriodDays: number };
  conversion: {
    orderId: string;
    clickId: string | null;
    customerType: string;
    country: string | null;
    source: string;
    click: {
      link: { id: string; channel: { name: string } | null; campaign: { name: string } | null };
    } | null;
  };
}

export const transactionInclude = {
  agreement: { select: { promoterOrganizationId: true, payerOrganizationId: true, returnsPeriodDays: true, lockingPeriodDays: true } },
  conversion: {
    select: {
      orderId: true,
      clickId: true,
      customerType: true,
      country: true,
      source: true,
      click: { select: { link: { select: { id: true, channel: { select: { name: true } }, campaign: { select: { name: true } } } } } },
    },
  },
} as const;

/**
 * Status is derived at read time from the agreement's returns/locking periods, so
 * Pending → Approved → Locked → Payable advances by itself; Paid and Reversed are stored.
 */
export function toTransaction(t: TransactionRow, now: string): Transaction {
  const base: Transaction = {
    id: t.id,
    partnershipId: t.partnershipId,
    directionId: t.agreementId,
    promoterId: t.agreement.promoterOrganizationId,
    payerId: t.agreement.payerOrganizationId,
    orderId: t.conversion.orderId,
    clickId: t.conversion.clickId ?? undefined,
    linkId: t.conversion.click?.link.id,
    date: t.occurredAt.toISOString(),
    saleCents: num(t.saleCents),
    commissionCents: num(t.commissionCents),
    currency: t.currency as Transaction["currency"],
    status: txStatus.app(t.status),
    channelName: t.conversion.click?.link.channel?.name ?? "Direct",
    campaignName: t.conversion.click?.link.campaign?.name ?? "—",
    customerType: t.conversion.customerType === "existing" ? "existing" : "new",
    country: t.conversion.country ?? undefined,
    reversedReason: t.reversedReason ?? undefined,
    source: t.conversion.source === "PIXEL" ? "pixel" : "api",
    approvedAt: iso(t.approvedAt),
    lockedAt: iso(t.lockedAt),
    payableAt: iso(t.payableAt),
    paidAt: iso(t.paidAt),
  };
  return { ...base, status: deriveStatus(base, t.agreement, now) };
}

/* ------------------------------------------------------------------ */
/* Links, payouts, flat fees, adjustments                               */
/* ------------------------------------------------------------------ */

export function toLink(
  l: {
    id: string;
    code: string;
    partnershipId: string;
    agreementId: string;
    promoterOrganizationId: string;
    payerOrganizationId: string;
    campaignId: string | null;
    channelId: string | null;
    placement: string;
    creative: string | null;
    kind: string;
    destination: string;
    createdAt: Date;
    campaign: { name: string } | null;
    channel: { name: string } | null;
    createdBy: string | null;
    _count: { clicks: number };
  },
  agg: { conversions: number; revenueCents: number } | undefined,
): TrackingLink {
  return {
    id: l.id,
    code: l.code,
    partnershipId: l.partnershipId,
    directionId: l.agreementId,
    promoterId: l.promoterOrganizationId,
    payerId: l.payerOrganizationId,
    campaignId: l.campaignId ?? undefined,
    campaignName: l.campaign?.name ?? "General",
    channelId: l.channelId ?? undefined,
    channelName: l.channel?.name ?? "Direct",
    placement: l.placement,
    creative: l.creative ?? undefined,
    kind: linkKind.app(l.kind),
    destination: l.destination,
    createdAt: l.createdAt.toISOString(),
    createdBy: l.createdBy ?? "—",
    clicks: l._count.clicks,
    conversions: agg?.conversions ?? 0,
    revenueCents: agg?.revenueCents ?? 0,
  };
}

export function toPayout(p: {
  id: string;
  partnershipId: string;
  promoterOrganizationId: string;
  payerOrganizationId: string;
  period: string;
  dueDate: Date;
  status: string;
  commissionCents: bigint;
  flatFeeCents: bigint;
  adjustmentCents: bigint;
  currency: string;
  _count: { transactions: number };
}): Payout {
  return {
    id: p.id,
    partnershipId: p.partnershipId,
    promoterId: p.promoterOrganizationId,
    payerId: p.payerOrganizationId,
    period: p.period,
    dueDate: p.dueDate.toISOString(),
    status: payoutStatus.app(p.status),
    commissionCents: num(p.commissionCents),
    flatFeeCents: num(p.flatFeeCents),
    adjustmentCents: num(p.adjustmentCents),
    transactionCount: p._count.transactions,
    currency: p.currency as Payout["currency"],
  };
}

export function toFlatFee(f: {
  id: string;
  partnershipId: string;
  agreementId: string;
  label: string;
  amountCents: bigint;
  dueDate: Date;
  status: string;
  agreement: { promoterOrganizationId: string; payerOrganizationId: string };
}): FlatFee {
  return {
    id: f.id,
    partnershipId: f.partnershipId,
    directionId: f.agreementId,
    promoterId: f.agreement.promoterOrganizationId,
    payerId: f.agreement.payerOrganizationId,
    label: f.label,
    amountCents: num(f.amountCents),
    dueDate: f.dueDate.toISOString(),
    status: flatFeeStatus.app(f.status),
  };
}

export function toAdjustment(a: {
  id: string;
  partnershipId: string;
  label: string;
  amountCents: bigint;
  createdAt: Date;
  promoterOrganizationId: string | null;
  payerOrganizationId: string | null;
}): Adjustment {
  return {
    id: a.id,
    partnershipId: a.partnershipId,
    promoterId: a.promoterOrganizationId ?? "",
    payerId: a.payerOrganizationId ?? "",
    label: a.label,
    amountCents: num(a.amountCents),
    createdAt: a.createdAt.toISOString(),
  };
}
