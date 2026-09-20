/**
 * Partnerships, negotiation, requests, opportunities, messages, team and the activity feed — all
 * scoped to the calling organization (`me`). Nothing here returns a partnership the caller isn't a member of.
 */
import type { ActivityItem, ConnectionRequest, DealDirection, DealStage, Message, Opportunity, Partnership, Role, TeamMember } from "../types";
import { formatMoney } from "../utils";
import { newId } from "../tracking";
import { db } from "./client";
import { agreementSelect, compensation, enumKey, toDirection } from "./mappers";

const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === "P2002";
const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const stageOf = (s: string) => title(s) as DealStage;

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* Partnerships                                                         */
/* ------------------------------------------------------------------ */

const partnershipInclude = {
  members: { orderBy: { id: "asc" as const } },
  agreements: { where: { endedAt: null }, select: agreementSelect },
  proposals: { orderBy: { version: "desc" as const }, take: 1 },
} as const;

type PartnershipRow = Awaited<ReturnType<typeof loadPartnerships>>[number];
const loadPartnerships = (where: object) =>
  db().partnership.findMany({ where, orderBy: { updatedAt: "desc" }, include: partnershipInclude });

function toPartnership(r: PartnershipRow, me: string): Partnership {
  const [a, b] = [r.members[0]!, r.members[1] ?? r.members[0]!];
  const mine = r.members.find((m) => m.organizationId === me);
  const other = r.members.find((m) => m.organizationId !== me);
  const proposalOpen = r.proposalStatus === "SENT" || r.proposalStatus === "COUNTERED";
  const latest = r.proposals[0];
  // While a proposal is open the Deal Room shows its terms; once accepted, the live agreements.
  const directions: DealDirection[] =
    proposalOpen && latest ? (latest.terms as unknown as DealDirection[]) : r.agreements.map((ag) => toDirection(ag));
  return {
    id: r.id,
    name: r.name,
    brandAId: a.organizationId,
    brandBId: b.organizationId,
    stage: stageOf(r.stage),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    summary: r.summary ?? "",
    directions,
    proposalStatus: title(r.proposalStatus) as Partnership["proposalStatus"],
    owner: mine?.ownerName ?? other?.ownerName ?? "—",
    nextStep: r.nextStep ?? undefined,
    proposalFromMe: proposalOpen && latest ? latest.proposedByOrganizationId === me : undefined,
  };
}

export async function listPartnerships(me: string): Promise<Partnership[]> {
  return (await loadPartnerships({ members: { some: { organizationId: me } } })).map((r) => toPartnership(r, me));
}

export async function getPartnership(id: string, me: string): Promise<Partnership | null> {
  const rows = await loadPartnerships({ id, members: { some: { organizationId: me } } });
  return rows[0] ? toPartnership(rows[0], me) : null;
}

/* ------------------------------------------------------------------ */
/* Negotiation                                                          */
/* ------------------------------------------------------------------ */

export type ProposalAction = "send" | "counter" | "accept";

function agreementFields(d: DealDirection) {
  const c = d.compensation;
  return {
    currency: d.currency,
    attributionWindowDays: d.attribution.windowDays,
    attributionMethod: enumKey(d.attribution.method) as never,
    clickAttribution: d.attribution.clickAttribution,
    promoCodeAttribution: d.attribution.promoCodeAttribution,
    eligibleProducts: d.rules.eligibleProducts,
    excludedSkus: d.rules.excludedSkus,
    customerRule: enumKey(d.rules.customers) as never,
    geoRestrictions: d.rules.geoRestrictions,
    returnsPeriodDays: d.rules.returnsPeriodDays,
    lockingPeriodDays: d.rules.lockingPeriodDays,
    paymentTerms: enumKey(d.paymentTerms) as never,
    customPaymentDays: d.customPaymentDays ?? null,
    rule: {
      model: compensation.db(c.model) as never,
      commissionBps: c.commissionBps ?? null,
      cpaCents: c.cpaCents !== undefined ? BigInt(c.cpaCents) : null,
      cplCents: c.cplCents !== undefined ? BigInt(c.cplCents) : null,
      cpcCents: c.cpcCents !== undefined ? BigInt(c.cpcCents) : null,
      flatFeeCents: c.flatFeeCents !== undefined ? BigInt(c.flatFeeCents) : null,
      flatFeeLabel: c.flatFeeLabel ?? null,
      notes: c.notes ?? null,
    },
  };
}

/**
 * send / counter store a Proposal snapshot and change nothing that is live.
 * accept applies the *stored* open proposal to the agreements — never the caller's current form state —
 * and only the side that did not propose it may accept.
 */
export async function submitProposal(input: {
  partnershipId: string;
  me: string;
  authorName: string;
  action: ProposalAction;
  directions: DealDirection[];
}): Promise<Result<{ message: string }>> {
  const p = db();
  return p.$transaction(async (tx) => {
    const pt = await tx.partnership.findFirst({
      where: { id: input.partnershipId, members: { some: { organizationId: input.me } } },
      include: { members: true, proposals: { orderBy: { version: "desc" }, take: 1 }, conversation: true },
    });
    if (!pt) return { ok: false as const, error: "Deal Room not found." };
    const latest = pt.proposals[0];
    const open = pt.proposalStatus === "SENT" || pt.proposalStatus === "COUNTERED";
    const now = new Date();
    const say = async (body: string) => {
      const conv = pt.conversation ?? (await tx.conversation.create({ data: { partnershipId: pt.id } }));
      await tx.message.create({ data: { id: newId("m"), conversationId: conv.id, authorOrganizationId: input.me, authorName: "System", kind: "SYSTEM", body } });
    };

    if (input.action === "accept") {
      if (!open || !latest) return { ok: false as const, error: "There's no open proposal to accept." };
      if (latest.proposedByOrganizationId === input.me) return { ok: false as const, error: "You can't accept your own proposal. The other side has to." };

      const terms = latest.terms as unknown as DealDirection[];
      const memberIds = pt.members.map((m) => m.organizationId);
      const kept = new Set<string>();
      for (const d of terms) {
        const payer = memberIds.find((m) => m !== d.promoterId);
        if (!payer || !memberIds.includes(d.promoterId)) return { ok: false as const, error: "The proposal names a brand outside this partnership." };
        kept.add(d.promoterId);
        const f = agreementFields(d);
        const { rule, ...data } = f;
        const existing = await tx.agreement.findFirst({ where: { partnershipId: pt.id, promoterOrganizationId: d.promoterId, endedAt: null }, select: { id: true } });
        const id = existing?.id ?? newId("d");
        if (existing) {
          await tx.agreement.update({ where: { id }, data });
          await tx.commissionRule.deleteMany({ where: { agreementId: id } });
          await tx.agreementChannel.deleteMany({ where: { agreementId: id } });
        } else {
          await tx.agreement.create({ data: { id, partnershipId: pt.id, promoterOrganizationId: d.promoterId, payerOrganizationId: payer, ...data } });
        }
        await tx.commissionRule.create({ data: { agreementId: id, ...rule } });
        const channelIds = (await tx.marketingChannel.findMany({ where: { id: { in: d.channelIds }, organizationId: d.promoterId }, select: { id: true } })).map((c) => c.id);
        if (channelIds.length) await tx.agreementChannel.createMany({ data: channelIds.map((channelId) => ({ agreementId: id, channelId })) });
      }
      // A direction dropped from the accepted terms ends (its history and links remain).
      await tx.agreement.updateMany({ where: { partnershipId: pt.id, endedAt: null, promoterOrganizationId: { notIn: [...kept] } }, data: { endedAt: now } });
      await tx.proposal.update({ where: { id: latest.id }, data: { status: "ACCEPTED" } });
      await tx.partnership.update({
        where: { id: pt.id },
        data: { proposalStatus: "ACCEPTED", updatedAt: now, ...(["DISCUSSION", "PROPOSAL", "TERMS"].includes(pt.stage) ? { stage: "INTEGRATION" as const } : {}) },
      });
      await say("Terms accepted. Moving to integration.");
      return { ok: true as const, message: "Terms accepted." };
    }

    if (input.directions.length === 0) return { ok: false as const, error: "Add at least one direction to the proposal." };
    const counter = open && !!latest && latest.proposedByOrganizationId !== input.me;
    if (input.action === "counter" && !counter) return { ok: false as const, error: "There's no open proposal from the other side to counter." };
    const status = counter ? "COUNTERED" : "SENT";
    await tx.proposal.create({
      data: { partnershipId: pt.id, version: (latest?.version ?? 0) + 1, proposedByOrganizationId: input.me, status, terms: input.directions as never },
    });
    await tx.partnership.update({
      where: { id: pt.id },
      data: { proposalStatus: status, updatedAt: now, ...(pt.stage === "DISCUSSION" ? { stage: "PROPOSAL" as const } : {}) },
    });
    await say(counter ? "A counter-proposal was submitted." : "A proposal was sent.");
    return { ok: true as const, message: counter ? "Counter sent." : "Proposal sent." };
  });
}

/* ------------------------------------------------------------------ */
/* Connection requests                                                  */
/* ------------------------------------------------------------------ */

const toRequest = (r: {
  id: string; fromOrganizationId: string; toOrganizationId: string; intro: string; idea: string; channelIds: string[];
  proposedModel: string | null; status: string; createdAt: Date; opportunityId: string | null;
}): ConnectionRequest => ({
  id: r.id,
  fromBrandId: r.fromOrganizationId,
  toBrandId: r.toOrganizationId,
  intro: r.intro,
  idea: r.idea,
  channelsOfInterest: r.channelIds,
  structure: r.proposedModel ? compensation.app(r.proposedModel) : "Open to discuss",
  createdAt: r.createdAt.toISOString(),
  status: title(r.status) as ConnectionRequest["status"],
  opportunityId: r.opportunityId ?? undefined,
});

export async function listRequests(me: string) {
  const rows = await db().connectionRequest.findMany({
    where: { OR: [{ fromOrganizationId: me }, { toOrganizationId: me }] },
    orderBy: { createdAt: "desc" },
  });
  const all = rows.map(toRequest);
  return { incoming: all.filter((r) => r.toBrandId === me), outgoing: all.filter((r) => r.fromBrandId === me) };
}

export async function countPendingRequests(me: string) {
  return db().connectionRequest.count({ where: { toOrganizationId: me, status: { in: ["PENDING", "QUESTION"] } } });
}

export async function createConnectionRequest(input: {
  from: string; to: string; intro: string; idea: string; channelIds: string[]; structure: string; opportunityId?: string;
}): Promise<Result> {
  const p = db();
  const pending = await p.connectionRequest.findFirst({
    where: { fromOrganizationId: input.from, toOrganizationId: input.to, status: "PENDING", opportunityId: input.opportunityId ?? null },
    select: { id: true },
  });
  if (pending) return { ok: false, error: "You already have a pending request with this brand." };
  const channels = await p.marketingChannel.findMany({ where: { id: { in: input.channelIds }, organizationId: input.to }, select: { id: true } });
  await p.connectionRequest.create({
    data: {
      id: newId("cr"), fromOrganizationId: input.from, toOrganizationId: input.to, intro: input.intro, idea: input.idea,
      channelIds: channels.map((c) => c.id),
      proposedModel: input.structure === "Open to discuss" ? null : (compensation.db(input.structure) as never),
      opportunityId: input.opportunityId,
    },
  });
  return { ok: true };
}

/** Accepting creates the Deal Room. Atomic: the status change only succeeds once, so no duplicate rooms. */
export async function respondToRequest(input: {
  requestId: string; me: string; decision: "Accepted" | "Declined" | "Question"; ownerName: string;
}): Promise<Result<{ message: string }>> {
  return db().$transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.connectionRequest.updateMany({
      where: { id: input.requestId, toOrganizationId: input.me, status: { in: ["PENDING", "QUESTION"] } },
      data: { status: enumKey(input.decision) as never, respondedAt: now },
    });
    if (claimed.count === 0) return { ok: false as const, error: "Request not found, or already answered." };
    if (input.decision !== "Accepted") {
      return { ok: true as const, message: input.decision === "Declined" ? "Request declined." : "Marked as awaiting your question." };
    }
    const req = await tx.connectionRequest.findUniqueOrThrow({ where: { id: input.requestId } });
    const orgs = await tx.organization.findMany({ where: { id: { in: [input.me, req.fromOrganizationId] } } });
    const name = (id: string) => orgs.find((o) => o.id === id)?.name ?? id;
    const id = newId("p");
    await tx.partnership.create({
      data: {
        id, name: `${name(input.me)} × ${name(req.fromOrganizationId)}`, stage: "DISCUSSION", summary: req.idea,
        nextStep: "Introduce your team and outline a proposal",
        members: { create: [{ organizationId: input.me, ownerName: input.ownerName }, { organizationId: req.fromOrganizationId }] },
        conversation: { create: {} },
      },
    });
    await tx.connectionRequest.update({ where: { id: input.requestId }, data: { partnershipId: id } });
    return { ok: true as const, message: "Deal Room created." };
  });
}

/* ------------------------------------------------------------------ */
/* Opportunities                                                        */
/* ------------------------------------------------------------------ */

export async function listOpportunities(): Promise<Opportunity[]> {
  const rows = await db().opportunity.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { requests: true } } } });
  return rows.map((o) => ({
    id: o.id,
    brandId: o.organizationId,
    title: o.title,
    summary: o.concept.length > 140 ? `${o.concept.slice(0, 137)}…` : o.concept,
    concept: o.concept,
    lookingFor: o.lookingFor,
    offering: o.offering,
    channelsWanted: o.channelsWanted,
    models: o.models.map((m) => compensation.app(m)),
    postedAt: o.createdAt.toISOString(),
    closesAt: o.closesAt?.toISOString(),
    applicants: o._count.requests,
    status: (o.status === "IN_REVIEW" ? "In review" : title(o.status)) as Opportunity["status"],
  }));
}

export async function countOpenOpportunities(me: string) {
  return db().opportunity.count({ where: { status: "OPEN", organizationId: { not: me } } });
}

export async function createOpportunity(input: {
  organizationId: string; title: string; concept: string; lookingFor: string[]; offering: string[]; channelsWanted: string[]; models: string[];
}) {
  await db().opportunity.create({
    data: {
      id: newId("opp"), organizationId: input.organizationId, title: input.title, concept: input.concept, lookingFor: input.lookingFor,
      offering: input.offering, channelsWanted: input.channelsWanted, models: input.models.map((m) => compensation.db(m)) as never,
    },
  });
}

export async function applyToOpportunity(input: { from: string; opportunityId: string; pitch: string }): Promise<Result<{ brandId: string }>> {
  const opp = await db().opportunity.findUnique({ where: { id: input.opportunityId } });
  if (!opp) return { ok: false, error: "Opportunity not found." };
  if (opp.organizationId === input.from) return { ok: false, error: "You can't apply to your own opportunity." };
  if (opp.status === "CLOSED") return { ok: false, error: "This opportunity is closed." };
  const already = await db().connectionRequest.findFirst({ where: { fromOrganizationId: input.from, opportunityId: opp.id }, select: { id: true } });
  if (already) return { ok: false, error: "You've already applied to this opportunity." };
  const r = await createConnectionRequest({
    from: input.from, to: opp.organizationId, intro: `Applying to “${opp.title}”.`, idea: input.pitch, channelIds: [], structure: "Open to discuss", opportunityId: opp.id,
  });
  return r.ok ? { ok: true, brandId: opp.organizationId } : r;
}

export async function appliedOpportunityIds(me: string): Promise<Set<string>> {
  const rows = await db().connectionRequest.findMany({ where: { fromOrganizationId: me, opportunityId: { not: null } }, select: { opportunityId: true } });
  return new Set(rows.map((r) => r.opportunityId!));
}

/* ------------------------------------------------------------------ */
/* Messages                                                             */
/* ------------------------------------------------------------------ */

const toMessage = (m: {
  id: string; authorName: string; authorOrganizationId: string; body: string; createdAt: Date; kind: string;
  attachments: unknown; mentions: string[]; conversation: { partnershipId: string };
}): Message => ({
  id: m.id,
  partnershipId: m.conversation.partnershipId,
  authorName: m.authorName,
  authorBrandId: m.authorOrganizationId,
  body: m.body,
  createdAt: m.createdAt.toISOString(),
  kind: m.kind.toLowerCase() as Message["kind"],
  attachments: (m.attachments as Message["attachments"]) ?? undefined,
  mentions: m.mentions.length ? m.mentions : undefined,
});

/** Internal notes are visible only to the organization that wrote them. */
const visibleTo = (me: string) => ({ NOT: { kind: "NOTE" as const, authorOrganizationId: { not: me } } });

export async function listMessages(partnershipId: string, me: string): Promise<Message[]> {
  const rows = await db().message.findMany({
    where: { conversation: { partnershipId, partnership: { members: { some: { organizationId: me } } } }, ...visibleTo(me) },
    orderBy: { createdAt: "asc" },
    include: { conversation: { select: { partnershipId: true } } },
  });
  return rows.map(toMessage);
}

/** Every visible message across the caller's partnerships, for the inbox. */
export async function listAllMessages(me: string): Promise<Message[]> {
  const rows = await db().message.findMany({
    where: { conversation: { partnership: { members: { some: { organizationId: me } } } }, ...visibleTo(me) },
    orderBy: { createdAt: "asc" },
    include: { conversation: { select: { partnershipId: true } } },
  });
  return rows.map(toMessage);
}

export async function postMessage(input: {
  partnershipId: string; me: string; authorName: string; body: string; note: boolean; mentions: string[];
}): Promise<Result> {
  const p = db();
  const pt = await p.partnership.findFirst({
    where: { id: input.partnershipId, members: { some: { organizationId: input.me } } },
    select: { id: true, conversation: { select: { id: true } } },
  });
  if (!pt) return { ok: false, error: "Deal Room not found." };
  const conversationId = pt.conversation?.id ?? (await p.conversation.create({ data: { partnershipId: pt.id } })).id;
  await p.$transaction([
    p.message.create({
      data: {
        id: newId("m"), conversationId, authorOrganizationId: input.me, authorName: input.authorName,
        kind: input.note ? "NOTE" : "MESSAGE", body: input.body, mentions: input.mentions,
      },
    }),
    p.partnership.update({ where: { id: pt.id }, data: { updatedAt: new Date() } }),
  ]);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Team                                                                 */
/* ------------------------------------------------------------------ */

export async function listTeam(organizationId: string): Promise<TeamMember[]> {
  const rows = await db().brandUser.findMany({ where: { organizationId }, orderBy: [{ status: "asc" }, { invitedAt: "asc" }] });
  return rows.map((m) => ({
    id: m.id,
    name: m.name ?? m.email.split("@")[0]!,
    email: m.email,
    role: m.role.toLowerCase() as Role,
    status: title(m.status) as TeamMember["status"],
  }));
}

export async function inviteMember(input: { organizationId: string; email: string; role: Role }): Promise<Result> {
  try {
    await db().brandUser.create({
      data: { id: newId("u"), organizationId: input.organizationId, email: input.email, name: input.email.split("@")[0], role: enumKey(input.role) as never, status: "INVITED" },
    });
    return { ok: true };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "That person is already on your team." };
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Activity feed (derived from real rows)                               */
/* ------------------------------------------------------------------ */

export async function recentActivity(me: string, brandName: (id: string) => string): Promise<ActivityItem[]> {
  const p = db();
  const mine = { members: { some: { organizationId: me } } };
  const [messages, requests, proposals, links, txns, payouts] = await Promise.all([
    p.message.findMany({
      where: { kind: "MESSAGE", conversation: { partnership: mine } }, orderBy: { createdAt: "desc" }, take: 4,
      include: { conversation: { select: { partnershipId: true } } },
    }),
    p.connectionRequest.findMany({ where: { toOrganizationId: me, status: { in: ["PENDING", "QUESTION"] } }, orderBy: { createdAt: "desc" }, take: 3 }),
    p.proposal.findMany({ where: { partnership: mine }, orderBy: { createdAt: "desc" }, take: 3, include: { partnership: { select: { id: true, name: true } } } }),
    p.trackingLink.findMany({
      where: { promoterOrganizationId: me }, orderBy: { createdAt: "desc" }, take: 3, include: { campaign: { select: { name: true } }, channel: { select: { name: true } } },
    }),
    p.transaction.findMany({
      where: { agreement: { OR: [{ promoterOrganizationId: me }, { payerOrganizationId: me }] } }, orderBy: { occurredAt: "desc" }, take: 3,
      include: { agreement: { select: { promoterOrganizationId: true, payerOrganizationId: true } } },
    }),
    p.payout.findMany({ where: { OR: [{ promoterOrganizationId: me }, { payerOrganizationId: me }], status: "PAID" }, orderBy: { dueDate: "desc" }, take: 2 }),
  ]);

  const items: ActivityItem[] = [
    ...messages.map((m): ActivityItem => ({
      id: `m_${m.id}`, kind: "message", title: `${m.authorName} (${brandName(m.authorOrganizationId)})`, detail: m.body,
      at: m.createdAt.toISOString(), href: `/partnerships/${m.conversation.partnershipId}?tab=messages`,
    })),
    ...requests.map((r): ActivityItem => ({
      id: `r_${r.id}`, kind: "request", title: `${brandName(r.fromOrganizationId)} requested a partnership`, detail: r.idea,
      at: r.createdAt.toISOString(), href: "/partnerships?tab=requests",
    })),
    ...proposals.map((pr): ActivityItem => ({
      id: `p_${pr.id}`, kind: "proposal",
      title: `${pr.status === "ACCEPTED" ? "Terms accepted" : pr.status === "COUNTERED" ? "Counter-proposal" : "Proposal sent"} · v${pr.version}`,
      detail: pr.partnership.name, at: pr.createdAt.toISOString(), href: `/partnerships/${pr.partnership.id}?tab=terms`,
    })),
    ...links.map((l): ActivityItem => ({
      id: `l_${l.id}`, kind: "link", title: "Tracking link created", detail: `${l.campaign?.name ?? "General"} · ${l.channel?.name ?? l.placement}`,
      at: l.createdAt.toISOString(), href: "/links",
    })),
    ...txns.map((t): ActivityItem => ({
      id: `t_${t.id}`, kind: "transaction",
      title: `New attributed sale · ${formatMoney(Number(t.saleCents))}`,
      detail: brandName(t.agreement.promoterOrganizationId === me ? t.agreement.payerOrganizationId : t.agreement.promoterOrganizationId),
      at: t.occurredAt.toISOString(), href: "/transactions",
    })),
    ...payouts.map((po): ActivityItem => ({
      id: `po_${po.id}`, kind: "payment",
      title: `Payment ${po.payerOrganizationId === me ? "to" : "from"} ${brandName(po.payerOrganizationId === me ? po.promoterOrganizationId : po.payerOrganizationId)}`,
      detail: `${po.period} · settled`, at: po.dueDate.toISOString(), href: "/payouts",
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
}
