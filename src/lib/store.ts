/**
 * Runtime store — an in-memory stand-in for the parts of the app not yet on Postgres:
 * partnerships & deal terms, opportunities, connection requests, messages and the team.
 *
 * The money pipeline (links, clicks, conversions, transactions, flat fees, payouts,
 * adjustments, API keys) has moved to the database — see src/lib/db/ledger.ts.
 *
 * Attached to globalThis so dev hot-reloads keep state. It does NOT survive a serverless
 * cold start: this is scaffolding until those entities move over too.
 */
import { CONNECTION_REQUESTS, MESSAGES, OPPORTUNITIES, PARTNERSHIPS } from "./data/partnerships";
import { TEAM } from "./data/ledger";
import type { ConnectionRequest, Message, Opportunity, Partnership, TeamMember } from "./types";

interface Store {
  messages: Message[];
  requests: ConnectionRequest[];
  partnerships: Partnership[];
  opportunities: Opportunity[];
  team: TeamMember[];
}

const g = globalThis as unknown as { __brandweave?: Store };

function init(): Store {
  return {
    messages: structuredClone(MESSAGES),
    requests: structuredClone(CONNECTION_REQUESTS),
    partnerships: structuredClone(PARTNERSHIPS),
    opportunities: structuredClone(OPPORTUNITIES),
    team: structuredClone(TEAM),
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
