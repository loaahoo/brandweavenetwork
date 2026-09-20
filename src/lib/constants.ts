import type {
  BrandSize,
  BusinessType,
  ChannelCategory,
  CompensationModel,
  LifecycleStage,
  Presence,
  Role,
} from "./types";

export const CHANNEL_CATEGORIES: ChannelCategory[] = [
  "Website",
  "Email",
  "Messaging",
  "App",
  "Loyalty",
  "Social & Content",
  "Physical",
  "Events",
  "Product",
];

/** Channel names a brand can list, grouped by category. */
export const CHANNEL_CATALOG: Record<ChannelCategory, string[]> = {
  Website: ["Website", "Product pages", "Checkout", "Post-purchase page", "Order confirmation", "Booking confirmation", "Member portal", "Customer dashboard"],
  Email: ["Email", "Newsletter", "Transactional email"],
  Messaging: ["SMS", "Push notifications"],
  App: ["Mobile app"],
  Loyalty: ["Loyalty program", "Rewards marketplace"],
  "Social & Content": ["Social media", "Content", "Blog"],
  Physical: ["Product packaging", "Inserts", "Retail stores", "In-store displays", "Receipts", "Physical locations", "Customer service"],
  Events: ["Events", "Venues", "Ticketing"],
  Product: ["Product integrations"],
};

export const INDUSTRIES = [
  "Travel & Hospitality",
  "Technology",
  "Entertainment",
  "Fitness & Wellness",
  "Beauty",
  "Automotive",
  "Financial Services",
  "Food & Beverage",
  "Retail & Outdoor",
  "Telecommunications",
  "Insurance",
] as const;

export const COMPENSATION_MODELS: CompensationModel[] = [
  "Commission",
  "CPA",
  "CPL",
  "CPC",
  "Revenue share",
  "Flat fee",
  "Hybrid",
  "Custom",
];

export const BRAND_SIZES: BrandSize[] = ["Startup", "Growth", "Mid-market", "Enterprise"];
export const BUSINESS_TYPES: BusinessType[] = ["B2C", "B2B", "B2B2C"];
export const PRESENCES: Presence[] = ["Online", "Offline", "Omnichannel"];
export const LIFECYCLE_STAGES: LifecycleStage[] = ["Awareness", "Consideration", "Purchase", "Post-purchase", "Loyalty"];

export const AUDIENCES = [
  "Frequent travelers",
  "Live-event fans",
  "Fitness enthusiasts",
  "Tech early adopters",
  "Beauty & self-care",
  "Families",
  "Outdoor adventurers",
  "Young professionals",
  "Luxury shoppers",
];

export const GEOGRAPHIES = ["United States", "Canada", "United Kingdom", "European Union", "Australia", "Global"];

export const AOV_BANDS = [
  { id: "under-50", label: "Under $50", min: 0, max: 5_000 },
  { id: "50-150", label: "$50 – $150", min: 5_000, max: 15_000 },
  { id: "150-500", label: "$150 – $500", min: 15_000, max: 50_000 },
  { id: "500-plus", label: "$500+", min: 50_000, max: Infinity },
] as const;

export const ROLES: { id: Role; label: string; description: string }[] = [
  { id: "owner", label: "Owner", description: "Full control, including billing and deleting the organization." },
  { id: "admin", label: "Admin", description: "Manage team, brand profile, integrations and all partnerships." },
  { id: "partnership_manager", label: "Partnership Manager", description: "Discover brands, negotiate deals, and manage partnerships." },
  { id: "marketing_manager", label: "Marketing Manager", description: "Manage channels, links, assets and campaigns." },
  { id: "finance", label: "Finance", description: "Review transactions, payouts and payment terms." },
  { id: "analyst", label: "Analyst", description: "View analytics and transactions." },
  { id: "read_only", label: "Read Only", description: "View-only access to partnerships and reporting." },
];

/** Organization-level permissions. Every server action checks one of these. */
export type Permission =
  | "team.manage"
  | "profile.edit"
  | "channels.manage"
  | "connections.send"
  | "deal.negotiate"
  | "deal.accept"
  | "links.create"
  | "assets.manage"
  | "messages.send"
  | "finance.view"
  | "finance.manage"
  | "analytics.view"
  | "integrations.manage";

const ALL: Permission[] = [
  "team.manage",
  "profile.edit",
  "channels.manage",
  "connections.send",
  "deal.negotiate",
  "deal.accept",
  "links.create",
  "assets.manage",
  "messages.send",
  "finance.view",
  "finance.manage",
  "analytics.view",
  "integrations.manage",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL,
  admin: ALL,
  partnership_manager: ["connections.send", "deal.negotiate", "deal.accept", "links.create", "messages.send", "channels.manage", "analytics.view", "finance.view"],
  marketing_manager: ["channels.manage", "links.create", "assets.manage", "messages.send", "analytics.view"],
  finance: ["finance.view", "finance.manage", "analytics.view", "messages.send"],
  analyst: ["analytics.view", "finance.view"],
  read_only: ["analytics.view"],
};

export const can = (role: Role, permission: Permission) => ROLE_PERMISSIONS[role].includes(permission);

export const NAV = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/opportunities", label: "Opportunities", icon: "sparkles" },
  { href: "/partnerships", label: "Partnerships", icon: "handshake" },
  { href: "/messages", label: "Messages", icon: "message" },
  { href: "/links", label: "Links & Assets", icon: "link" },
  { href: "/transactions", label: "Transactions", icon: "receipt" },
  { href: "/payouts", label: "Payouts", icon: "wallet" },
  { href: "/analytics", label: "Analytics", icon: "chart" },
  { href: "/integrations", label: "Integrations", icon: "plug" },
  { href: "/brand-profile", label: "Brand Profile", icon: "building" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;
