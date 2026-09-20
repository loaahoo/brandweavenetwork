/**
 * Domain types. These mirror prisma/schema.prisma so the in-memory demo data
 * can be swapped for the database without touching UI code.
 *
 * Conventions
 *  - Money is integer minor units (cents). Never floats.
 *  - Rates are basis points (1500 = 15.00%).
 *  - Dates are ISO-8601 strings at the boundary.
 *
 * Vocabulary: a *promoter* is the brand exposing a channel and generating
 * Partner Revenue; the *payer* is the brand that receives the traffic/sales and
 * owes the payout. A partnership can contain a direction in each way.
 */

export type Role =
  | "owner"
  | "admin"
  | "partnership_manager"
  | "marketing_manager"
  | "finance"
  | "analyst"
  | "read_only";

export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

export type BrandSize = "Startup" | "Growth" | "Mid-market" | "Enterprise";
export type BusinessType = "B2C" | "B2B" | "B2B2C";
export type Presence = "Online" | "Offline" | "Omnichannel";
export type LifecycleStage = "Awareness" | "Consideration" | "Purchase" | "Post-purchase" | "Loyalty";

export type ChannelCategory =
  | "Website"
  | "Email"
  | "Messaging"
  | "App"
  | "Loyalty"
  | "Social & Content"
  | "Physical"
  | "Events"
  | "Product";

export type ChannelStatus = "Available" | "Limited" | "Waitlist" | "Paused";

export type CompensationModel =
  | "Commission"
  | "CPA"
  | "CPL"
  | "CPC"
  | "Revenue share"
  | "Flat fee"
  | "Hybrid"
  | "Custom";

export interface Audience {
  primary: string;
  ageRanges: string[];
  geography: string[];
  interests: string[];
  segments: string[];
  householdIncome?: string;
  customerType: string;
  purchaseBehavior?: string;
  loyaltyMembers?: number;
  monthlyCustomers?: number;
  monthlyTraffic?: number;
  appUsers?: number;
  emailSubscribers?: number;
  socialFollowing?: number;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  website: string;
  industry: string;
  subcategory: string;
  headquarters: string;
  markets: string[];
  description: string;
  productCategories: string[];
  averageOrderValueCents: number;
  businessModel: string;
  businessType: BusinessType;
  presence: Presence;
  size: BrandSize;
  lifecycleStages: LifecycleStage[];
  audience: Audience;
  lookingFor: string[];
  partnershipModels: CompensationModel[];
  /** Brand colour used for the generated logo tile. */
  color: string;
  verified: boolean;
  activePartnerships: number;
}

export interface Channel {
  id: string;
  brandId: string;
  name: string;
  category: ChannelCategory;
  description: string;
  monthlyReach: number;
  reachLabel: string;
  geography: string[];
  segment: string;
  placements: string[];
  partnershipTypes: CompensationModel[];
  compensationPreference: string;
  minimumCommitment: string;
  restrictions: string[];
  approvalRequired: boolean;
  status: ChannelStatus;
  desiredPartnerCategories: string[];
}

export interface Opportunity {
  id: string;
  brandId: string;
  title: string;
  summary: string;
  concept: string;
  lookingFor: string[];
  offering: string[];
  channelsWanted: string[];
  models: CompensationModel[];
  postedAt: string;
  closesAt?: string;
  applicants: number;
  status: "Open" | "In review" | "Closed";
}

export type DealStage = "Discussion" | "Proposal" | "Terms" | "Integration" | "Live";
export const DEAL_STAGES: DealStage[] = ["Discussion", "Proposal", "Terms", "Integration", "Live"];

export type AttributionMethod = "last_click" | "first_click" | "custom";
export type CustomerRule = "new_only" | "existing_ok" | "all";
export type PaymentTerms = "net15" | "net30" | "net45" | "custom";

export interface Compensation {
  model: CompensationModel;
  /** Percentage on eligible revenue, basis points. Used by Commission, Revenue share, Hybrid. */
  commissionBps?: number;
  /** Fixed amount per approved sale. */
  cpaCents?: number;
  /** Fixed amount per qualified lead. */
  cplCents?: number;
  /** Fixed amount per click. */
  cpcCents?: number;
  /** One-off non-performance fee (sponsorship, placement, activation...). */
  flatFeeCents?: number;
  flatFeeLabel?: string;
  /** Custom tiered rates on cumulative eligible revenue. */
  tiers?: { upToCents: number | null; bps: number }[];
  notes?: string;
}

export interface TransactionRules {
  eligibleProducts: string[];
  excludedSkus: string[];
  customers: CustomerRule;
  geoRestrictions: string[];
  returnsPeriodDays: number;
  lockingPeriodDays: number;
}

export interface AttributionRules {
  windowDays: number;
  method: AttributionMethod;
  clickAttribution: boolean;
  promoCodeAttribution: boolean;
}

/** One direction of a partnership: `promoterId` drives sales to `payerId`, who pays. */
export interface DealDirection {
  id: string;
  promoterId: string;
  payerId: string;
  channelIds: string[];
  compensation: Compensation;
  attribution: AttributionRules;
  rules: TransactionRules;
  paymentTerms: PaymentTerms;
  customPaymentDays?: number;
  currency: Currency;
}

export interface Partnership {
  id: string;
  name: string;
  brandAId: string;
  brandBId: string;
  stage: DealStage;
  createdAt: string;
  updatedAt: string;
  summary: string;
  directions: DealDirection[];
  proposalStatus: "None" | "Draft" | "Sent" | "Countered" | "Accepted";
  owner: string;
  nextStep?: string;
  /** True when the currently open proposal was sent by the viewing organization (so it must wait for the other side). */
  proposalFromMe?: boolean;
}

export interface ConnectionRequest {
  id: string;
  fromBrandId: string;
  toBrandId: string;
  intro: string;
  idea: string;
  channelsOfInterest: string[];
  structure: CompensationModel | "Open to discuss";
  createdAt: string;
  status: "Pending" | "Accepted" | "Declined" | "Question";
  /** Set when this request is an application to a posted Opportunity. */
  opportunityId?: string;
}

export interface Message {
  id: string;
  partnershipId: string;
  authorName: string;
  authorBrandId: string;
  body: string;
  createdAt: string;
  kind?: "message" | "note" | "system";
  attachments?: { name: string; size: string }[];
  mentions?: string[];
}

export interface Campaign {
  id: string;
  partnershipId: string;
  name: string;
  status: "Draft" | "Live" | "Paused" | "Ended";
}

export type LinkKind = "Standard" | "Campaign" | "Placement" | "Product" | "Deep link" | "QR code";

export interface TrackingLink {
  id: string;
  code: string;
  partnershipId: string;
  directionId: string;
  promoterId: string;
  payerId: string;
  campaignId?: string;
  campaignName: string;
  channelId?: string;
  channelName: string;
  placement: string;
  creative?: string;
  kind: LinkKind;
  destination: string;
  createdAt: string;
  createdBy: string;
  clicks: number;
  conversions: number;
  revenueCents: number;
}

export interface Click {
  clickId: string;
  linkId: string;
  code: string;
  partnershipId: string;
  directionId: string;
  promoterId: string;
  payerId: string;
  campaignId?: string;
  channelId?: string;
  placement: string;
  creative?: string;
  destination: string;
  timestamp: string;
  country?: string;
  userAgent?: string;
}

export interface LineItem {
  sku: string;
  priceCents: number;
  quantity: number;
}

export interface ConversionEvent {
  orderId: string;
  clickId: string;
  revenueCents: number;
  currency: Currency;
  items?: LineItem[];
  customerType: "new" | "existing";
  country?: string;
  timestamp: string;
  source: "api" | "pixel";
}

export type TransactionStatus = "Pending" | "Approved" | "Locked" | "Payable" | "Paid" | "Reversed";
export const TRANSACTION_STATUSES: TransactionStatus[] = [
  "Pending",
  "Approved",
  "Locked",
  "Payable",
  "Paid",
  "Reversed",
];

export interface Transaction {
  id: string;
  partnershipId: string;
  directionId: string;
  promoterId: string;
  payerId: string;
  orderId: string;
  clickId?: string;
  linkId?: string;
  date: string;
  saleCents: number;
  commissionCents: number;
  currency: Currency;
  status: TransactionStatus;
  channelName: string;
  campaignName: string;
  customerType: "new" | "existing";
  country?: string;
  reversedReason?: string;
  source: "api" | "pixel";
  /** Timestamps at which the lifecycle advanced; drives status derivation. */
  approvedAt?: string;
  lockedAt?: string;
  payableAt?: string;
  paidAt?: string;
}

export interface FlatFee {
  id: string;
  partnershipId: string;
  directionId: string;
  promoterId: string;
  payerId: string;
  label: string;
  amountCents: number;
  dueDate: string;
  status: "Scheduled" | "Payable" | "Paid";
}

export interface Adjustment {
  id: string;
  partnershipId: string;
  promoterId: string;
  payerId: string;
  label: string;
  amountCents: number;
  createdAt: string;
}

export interface Payout {
  id: string;
  partnershipId: string;
  promoterId: string;
  payerId: string;
  period: string;
  dueDate: string;
  status: "Draft" | "Payable" | "Paid" | "Overdue";
  commissionCents: number;
  flatFeeCents: number;
  adjustmentCents: number;
  transactionCount: number;
  currency: Currency;
}

export type AssetKind = "Logo" | "Product image" | "Video" | "Guidelines" | "Banner" | "Copy" | "Landing page" | "Offer" | "Promo code";
export interface Asset {
  id: string;
  brandId: string;
  name: string;
  kind: AssetKind;
  detail: string;
  updatedAt: string;
  approved: boolean;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: "Connected" | "Available" | "Coming soon";
  category: "Tracking" | "Commerce" | "Payments" | "Data";
}

export interface ActivityItem {
  id: string;
  kind: "message" | "request" | "proposal" | "link" | "transaction" | "payment";
  title: string;
  detail: string;
  at: string;
  href?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "Active" | "Invited";
}
