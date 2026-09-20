/**
 * Runtime store — an in-memory stand-in for the database.
 *
 * Everything the app *writes* (clicks, conversions, new links, messages,
 * requests) lands here; seeded data lives in ./data. Swap this module for
 * Prisma queries (see prisma/schema.prisma) and nothing above it changes.
 * It is attached to globalThis so dev hot-reloads keep state, and it does NOT
 * survive a serverless cold start — it is demo scaffolding, not persistence.
 */
import { BRANDS } from "./data/brands";
import { CONNECTION_REQUESTS, MESSAGES, OPPORTUNITIES, PARTNERSHIPS } from "./data/partnerships";
import {
  SEED_ADJUSTMENTS,
  TEAM,
  SEED_FLAT_FEES,
  SEED_LINKS,
  SEED_PAYOUTS,
  SEED_TRANSACTIONS,
} from "./data/ledger";
import type {
  Adjustment,
  Click,
  ConnectionRequest,
  ConversionEvent,
  FlatFee,
  Message,
  Opportunity,
  Partnership,
  Payout,
  TeamMember,
  TrackingLink,
  Transaction,
} from "./types";

interface Store {
  links: TrackingLink[];
  clicks: Click[];
  conversions: (ConversionEvent & { attributed: boolean; reasons: string[]; payerId: string })[];
  transactions: Transaction[];
  adjustments: Adjustment[];
  flatFees: FlatFee[];
  payouts: Payout[];
  messages: Message[];
  requests: ConnectionRequest[];
  partnerships: Partnership[];
  opportunities: Opportunity[];
  team: TeamMember[];
  /** Demo API keys → brand id. In production keys are hashed at rest and scoped per organization. */
  apiKeys: Map<string, string>;
}

const g = globalThis as unknown as { __brandweave?: Store };

function init(): Store {
  return {
    links: structuredClone(SEED_LINKS),
    clicks: [],
    conversions: [],
    transactions: structuredClone(SEED_TRANSACTIONS),
    adjustments: structuredClone(SEED_ADJUSTMENTS),
    flatFees: structuredClone(SEED_FLAT_FEES),
    payouts: structuredClone(SEED_PAYOUTS),
    messages: structuredClone(MESSAGES),
    requests: structuredClone(CONNECTION_REQUESTS),
    partnerships: structuredClone(PARTNERSHIPS),
    opportunities: structuredClone(OPPORTUNITIES),
    team: structuredClone(TEAM),
    apiKeys: new Map(BRANDS.map((b) => [`bw_test_${b.id}_demo`, b.id])),
  };
}

export function store(): Store {
  return (g.__brandweave ??= init());
}

/** Test helper: reset to the seeded state. */
export function resetStore() {
  g.__brandweave = init();
}

export const getPartnership = (id: string) => store().partnerships.find((p) => p.id === id);
export const getOpportunity = (id: string) => store().opportunities.find((o) => o.id === id);
