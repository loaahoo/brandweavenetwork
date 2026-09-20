/**
 * Integration test for partnerships, negotiation, messaging, opportunities and team against the real database.
 * Uses two seeded brands that have no partnership (harvest, atlas) and removes everything it creates.
 *
 *   BW_INTEGRATION=1 npm test
 */
import { existsSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import type { DealDirection } from "../types";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const enabled = process.env.BW_INTEGRATION === "1" && !!process.env.DATABASE_URL;
const RUN = `IT${Date.now()}`;

const terms = (promoterId: string, payerId: string): DealDirection => ({
  id: `proposed_${promoterId}`,
  promoterId,
  payerId,
  channelIds: [],
  currency: "USD",
  compensation: { model: "CPA", cpaCents: 1_000 },
  attribution: { windowDays: 30, method: "last_click", clickAttribution: true, promoCodeAttribution: false },
  rules: { eligibleProducts: [], excludedSkus: [], customers: "all", geoRestrictions: [], returnsPeriodDays: 30, lockingPeriodDays: 15 },
  paymentTerms: "net30",
});

describe.skipIf(!enabled)("network (integration)", () => {
  afterAll(async () => {
    const { db } = await import("./client");
    const p = db();
    await p.connectionRequest.deleteMany({ where: { OR: [{ intro: { contains: RUN } }, { idea: { contains: RUN } }] } });
    await p.partnership.deleteMany({ where: { summary: { contains: RUN } } }); // cascades members, conversation, messages, proposals, agreements
    await p.opportunity.deleteMany({ where: { title: { contains: RUN } } });
    await p.brandUser.deleteMany({ where: { email: { contains: RUN.toLowerCase() } } });
    await p.$disconnect();
  });

  it("request → atomic accept → Deal Room; messages, notes and negotiation rules hold", async () => {
    const n = await import("./network");
    const { db } = await import("./client");

    // ---- request
    const sent = await n.createConnectionRequest({ from: "harvest", to: "atlas", intro: `Hello ${RUN}`, idea: `Bundle ${RUN}`, channelIds: ["ch_atlas_embed", "ch_voyago_email"], structure: "CPA" });
    expect(sent.ok).toBe(true);
    expect((await n.createConnectionRequest({ from: "harvest", to: "atlas", intro: `Hello ${RUN}`, idea: `Bundle ${RUN}`, channelIds: [], structure: "CPA" })).ok).toBe(false); // duplicate pending
    const req = (await n.listRequests("atlas")).incoming.find((r) => r.intro.includes(RUN))!;
    expect(req.channelsOfInterest).toEqual(["ch_atlas_embed"]); // another brand's channel is dropped
    expect(req.structure).toBe("CPA");

    // ---- accept: only the recipient; only once
    expect((await n.respondToRequest({ requestId: req.id, me: "harvest", decision: "Accepted", ownerName: "X" })).ok).toBe(false);
    const [a, b] = await Promise.all([
      n.respondToRequest({ requestId: req.id, me: "atlas", decision: "Accepted", ownerName: "Tester" }),
      n.respondToRequest({ requestId: req.id, me: "atlas", decision: "Accepted", ownerName: "Tester" }),
    ]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]); // exactly one Deal Room, even under a race
    expect((await db().partnership.count({ where: { summary: { contains: RUN } } }))).toBe(1);

    const room = (await n.listPartnerships("atlas")).find((p) => p.summary.includes(RUN))!;
    expect(room.stage).toBe("Discussion");
    expect(room.owner).toBe("Tester");
    expect((await n.listPartnerships("bloom")).some((p) => p.id === room.id)).toBe(false);
    expect(await n.getPartnership(room.id, "bloom")).toBeNull();

    // ---- messages: notes are private to their organization; strangers see and post nothing
    expect((await n.postMessage({ partnershipId: room.id, me: "harvest", authorName: "H", body: `secret ${RUN}`, note: true, mentions: [] })).ok).toBe(true);
    expect((await n.postMessage({ partnershipId: room.id, me: "atlas", authorName: "A", body: `hi ${RUN}`, note: false, mentions: [] })).ok).toBe(true);
    expect((await n.listMessages(room.id, "atlas")).map((m) => m.body)).toEqual([`hi ${RUN}`]);
    expect((await n.listMessages(room.id, "harvest")).map((m) => m.body).sort()).toEqual([`hi ${RUN}`, `secret ${RUN}`].sort());
    expect(await n.listMessages(room.id, "bloom")).toEqual([]);
    expect((await n.postMessage({ partnershipId: room.id, me: "bloom", authorName: "B", body: "x", note: false, mentions: [] })).ok).toBe(false);

    // ---- negotiation
    const send = await n.submitProposal({ partnershipId: room.id, me: "harvest", authorName: "H", action: "send", directions: [terms("harvest", "atlas")] });
    expect(send.ok).toBe(true);
    expect(await db().agreement.count({ where: { partnershipId: room.id } })).toBe(0); // sending changes nothing live

    const afterSend = (await n.getPartnership(room.id, "harvest"))!;
    expect(afterSend.proposalStatus).toBe("Sent");
    expect(afterSend.stage).toBe("Proposal");
    expect(afterSend.proposalFromMe).toBe(true);
    expect((await n.getPartnership(room.id, "atlas"))!.proposalFromMe).toBe(false);

    const own = await n.submitProposal({ partnershipId: room.id, me: "harvest", authorName: "H", action: "accept", directions: [] });
    expect(own).toEqual({ ok: false, error: "You can't accept your own proposal. The other side has to." });
    expect((await n.submitProposal({ partnershipId: room.id, me: "bloom", authorName: "B", action: "accept", directions: [] })).ok).toBe(false);
    expect((await n.submitProposal({ partnershipId: room.id, me: "harvest", authorName: "H", action: "counter", directions: [terms("harvest", "atlas")] })).ok).toBe(false); // nothing from the other side to counter

    expect((await n.submitProposal({ partnershipId: room.id, me: "atlas", authorName: "A", action: "accept", directions: [] })).ok).toBe(true);
    const live = (await n.getPartnership(room.id, "atlas"))!;
    expect(live.stage).toBe("Integration");
    expect(live.proposalStatus).toBe("Accepted");
    expect(live.directions).toHaveLength(1);
    expect(live.directions[0]!.compensation).toMatchObject({ model: "CPA", cpaCents: 1_000 });
    expect(live.directions[0]!.promoterId).toBe("harvest");
    expect((await n.submitProposal({ partnershipId: room.id, me: "atlas", authorName: "A", action: "accept", directions: [] })).ok).toBe(false); // nothing left to accept
  }, 90_000);

  it("opportunities: post, apply once, not to your own; team invites are unique", async () => {
    const n = await import("./network");
    await n.createOpportunity({ organizationId: "harvest", title: `Test ${RUN}`, concept: "x".repeat(30), lookingFor: ["Anyone"], offering: [], channelsWanted: [], models: ["CPA"] });
    const opp = (await n.listOpportunities()).find((o) => o.title.includes(RUN))!;
    expect(opp.applicants).toBe(0);

    expect((await n.applyToOpportunity({ from: "harvest", opportunityId: opp.id, pitch: "p".repeat(30) })).ok).toBe(false); // own
    expect((await n.applyToOpportunity({ from: "atlas", opportunityId: opp.id, pitch: `pitch ${RUN}` })).ok).toBe(true);
    expect((await n.applyToOpportunity({ from: "atlas", opportunityId: opp.id, pitch: `pitch ${RUN}` })).ok).toBe(false); // already applied
    expect((await n.listOpportunities()).find((o) => o.id === opp.id)!.applicants).toBe(1);
    expect((await n.appliedOpportunityIds("atlas")).has(opp.id)).toBe(true);

    const email = `${RUN.toLowerCase()}@example.test`;
    expect((await n.inviteMember({ organizationId: "harvest", email, role: "read_only" })).ok).toBe(true);
    expect((await n.inviteMember({ organizationId: "harvest", email, role: "read_only" })).ok).toBe(false);
    expect((await n.listTeam("harvest")).find((m) => m.email === email)).toMatchObject({ role: "read_only", status: "Invited" });
  }, 60_000);
});
