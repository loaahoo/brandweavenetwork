/**
 * The network directory: brands, their Available Channels and assets.
 *
 * This is small, read-mostly reference data shared by every organization, so a page loads it once per
 * request (`await getDirectory()`) and reads from the snapshot synchronously. React's `cache` makes
 * every caller in the same request share that single load.
 */
import { cache } from "react";
import { BRAND_SIZES, BUSINESS_TYPES, CHANNEL_CATEGORIES, PRESENCES } from "../constants";
import type { Asset, AssetKind, Brand, Channel, ChannelStatus, CompensationModel } from "../types";
import { db } from "./client";
import { compensation } from "./mappers";

const KEY = (s: string) => s.toUpperCase().replace(/[ &-]+/g, "_");
/** Build DB-enum → display-string lookup from a list of display values ("Mid-market" ⇄ MID_MARKET). */
const displayOf = <T extends string>(values: readonly T[]) => {
  const m = new Map(values.map((v) => [KEY(v), v]));
  return (dbValue: string) => m.get(dbValue) as T;
};
const businessType = displayOf(BUSINESS_TYPES);
const presence = displayOf(PRESENCES);
const size = displayOf(BRAND_SIZES);
const channelCategory = displayOf(CHANNEL_CATEGORIES);
const channelStatus = displayOf<ChannelStatus>(["Available", "Limited", "Waitlist", "Paused"]);
const assetKind = displayOf<AssetKind>(["Logo", "Product image", "Video", "Guidelines", "Banner", "Copy", "Landing page", "Offer", "Promo code"]);

const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export interface Directory {
  brands: Brand[];
  channels: Channel[];
  brand(id: string): Brand | undefined;
  brandBySlug(slug: string): Brand | undefined;
  channel(id: string): Channel | undefined;
  channelsFor(brandId: string): Channel[];
}

export const getDirectory = cache(async (): Promise<Directory> => {
  const p = db();
  const [orgs, channelRows, live] = await Promise.all([
    p.organization.findMany({ include: { profile: true }, orderBy: { createdAt: "asc" } }),
    p.marketingChannel.findMany({ orderBy: { createdAt: "asc" } }),
    p.partnership.findMany({ where: { stage: "LIVE" }, select: { members: { select: { organizationId: true } } } }),
  ]);

  const liveCount = new Map<string, number>();
  for (const pt of live) for (const m of pt.members) liveCount.set(m.organizationId, (liveCount.get(m.organizationId) ?? 0) + 1);

  const brands: Brand[] = orgs
    .filter((o) => o.profile)
    .map((o) => {
      const pr = o.profile!;
      return {
        id: o.id,
        slug: o.slug,
        name: o.name,
        tagline: pr.tagline ?? "",
        website: pr.website ?? "",
        industry: pr.industry,
        subcategory: pr.subcategory ?? "",
        headquarters: pr.headquarters ?? "",
        markets: pr.markets,
        description: pr.description ?? "",
        productCategories: pr.productCategories,
        averageOrderValueCents: Number(pr.averageOrderValueCents ?? 0),
        businessModel: pr.businessModel ?? "",
        businessType: businessType(pr.businessType),
        presence: presence(pr.presence),
        size: pr.size ? size(pr.size) : "Startup",
        lifecycleStages: pr.lifecycleStages as Brand["lifecycleStages"],
        audience: {
          primary: pr.primaryAudience ?? "",
          ageRanges: pr.ageRanges,
          geography: pr.audienceGeography,
          interests: pr.interests,
          segments: pr.segments,
          householdIncome: pr.householdIncome ?? undefined,
          customerType: pr.customerType ?? "",
          purchaseBehavior: pr.purchaseBehavior ?? undefined,
          loyaltyMembers: pr.loyaltyMembers ?? undefined,
          monthlyCustomers: pr.monthlyCustomers ?? undefined,
          monthlyTraffic: pr.monthlyTraffic ?? undefined,
          appUsers: pr.appUsers ?? undefined,
          emailSubscribers: pr.emailSubscribers ?? undefined,
          socialFollowing: pr.socialFollowing ?? undefined,
        },
        lookingFor: pr.lookingFor,
        partnershipModels: pr.partnershipModels.map((m) => compensation.app(m)) as CompensationModel[],
        color: pr.color ?? "#5b5cf3",
        verified: pr.verified,
        activePartnerships: liveCount.get(o.id) ?? 0,
      };
    });

  const channels: Channel[] = channelRows.map((c) => ({
    id: c.id,
    brandId: c.organizationId,
    name: c.name,
    category: channelCategory(c.category),
    description: c.description,
    monthlyReach: c.monthlyReach ?? 0,
    reachLabel: c.monthlyReach ? `${compact(c.monthlyReach)} ${c.reachUnit ?? ""}`.trim() : "—",
    geography: c.geography,
    segment: c.segment ?? "",
    placements: c.placementExamples,
    partnershipTypes: c.partnershipTypes.map((m) => compensation.app(m)) as CompensationModel[],
    compensationPreference: c.compensationPreference ?? "",
    minimumCommitment: c.minimumCommitment ?? "",
    restrictions: c.restrictions,
    approvalRequired: c.approvalRequired,
    status: channelStatus(c.status),
    desiredPartnerCategories: c.desiredPartnerCategories,
  }));

  const byId = new Map(brands.map((b) => [b.id, b]));
  const bySlug = new Map(brands.map((b) => [b.slug, b]));
  const chById = new Map(channels.map((c) => [c.id, c]));
  return {
    brands,
    channels,
    brand: (id) => byId.get(id),
    brandBySlug: (slug) => bySlug.get(slug),
    channel: (id) => chById.get(id),
    channelsFor: (brandId) => channels.filter((c) => c.brandId === brandId),
  };
});

export async function listAssets(organizationId: string): Promise<Asset[]> {
  const rows = await db().asset.findMany({ where: { organizationId }, orderBy: { updatedAt: "desc" } });
  return rows.map((a) => ({
    id: a.id,
    brandId: a.organizationId,
    name: a.name,
    kind: assetKind(a.kind),
    detail: a.detail ?? "",
    updatedAt: a.updatedAt.toISOString(),
    approved: a.approved,
  }));
}

/** Only fields present in `patch` change; audience figures left undefined are cleared to null. */
export async function updateBrandProfile(
  organizationId: string,
  patch: {
    tagline: string;
    description: string;
    headquarters: string;
    lookingFor: string[];
    partnershipModels: CompensationModel[];
    averageOrderValueCents?: number;
    primaryAudience: string;
    audience: Partial<Record<"monthlyCustomers" | "monthlyTraffic" | "appUsers" | "emailSubscribers" | "loyaltyMembers" | "socialFollowing", number | undefined>>;
  },
) {
  await db().brandProfile.update({
    where: { organizationId },
    data: {
      tagline: patch.tagline,
      description: patch.description,
      headquarters: patch.headquarters,
      lookingFor: patch.lookingFor,
      partnershipModels: patch.partnershipModels.map((m) => compensation.db(m)) as never,
      ...(patch.averageOrderValueCents !== undefined ? { averageOrderValueCents: BigInt(patch.averageOrderValueCents) } : {}),
      primaryAudience: patch.primaryAudience,
      monthlyCustomers: patch.audience.monthlyCustomers ?? null,
      monthlyTraffic: patch.audience.monthlyTraffic ?? null,
      appUsers: patch.audience.appUsers ?? null,
      emailSubscribers: patch.audience.emailSubscribers ?? null,
      loyaltyMembers: patch.audience.loyaltyMembers ?? null,
      socialFollowing: patch.audience.socialFollowing ?? null,
    },
  });
}
