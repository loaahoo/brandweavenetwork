"use server";

import { revalidatePath } from "next/cache";
import { can, COMPENSATION_MODELS, type Permission } from "@/lib/constants";
import { CURRENT_BRAND_ID, getBrand, saveBrandProfile } from "@/lib/data/brands";
import { getChannel } from "@/lib/data/channels";
import { CURRENT_USER } from "@/lib/data/ledger";
import { getOpportunity, getPartnership, store } from "@/lib/store";
import { newId, newLinkCode, normalizeDestination } from "@/lib/tracking";
import type { Compensation, CompensationModel, DealDirection, LinkKind, Role } from "@/lib/types";

/**
 * Every action re-checks the caller's organization role on the server — UI hiding
 * a button is never the access control. `CURRENT_USER` is the demo session; swap
 * for the auth provider's session (Clerk / Auth.js) and keep the checks.
 */
export type ActionResult<T = unknown> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

const deny = (p: Permission): ActionResult | null =>
  can(CURRENT_USER.role, p) ? null : { ok: false, error: "Your role doesn't have permission to do that." };

const text = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);

/* ---------- Connection requests ---------- */

export async function sendConnectionRequest(fd: FormData): Promise<ActionResult> {
  const denied = deny("connections.send");
  if (denied) return denied;

  const toBrandId = text(fd, "toBrandId", 64);
  const to = getBrand(toBrandId);
  if (!to || to.id === CURRENT_BRAND_ID) return { ok: false, error: "That brand can't be found." };

  const intro = text(fd, "intro", 600);
  const idea = text(fd, "idea", 1200);
  if (intro.length < 10) return { ok: false, error: "Add a short introduction (at least 10 characters)." };
  if (idea.length < 10) return { ok: false, error: "Describe your partnership idea (at least 10 characters)." };

  const structure = text(fd, "structure", 32);
  const validStructure = structure === "Open to discuss" || COMPENSATION_MODELS.includes(structure as CompensationModel);
  if (!validStructure) return { ok: false, error: "Choose a valid commercial structure." };

  const s = store();
  if (s.requests.some((r) => r.fromBrandId === CURRENT_BRAND_ID && r.toBrandId === to.id && r.status === "Pending")) {
    return { ok: false, error: `You already have a pending request with ${to.name}.` };
  }

  const channelsOfInterest = fd
    .getAll("channels")
    .map(String)
    .filter((id) => getChannel(id)?.brandId === to.id);

  s.requests.unshift({
    id: newId("cr"),
    fromBrandId: CURRENT_BRAND_ID,
    toBrandId: to.id,
    intro,
    idea,
    channelsOfInterest,
    structure: structure as CompensationModel | "Open to discuss",
    createdAt: new Date().toISOString(),
    status: "Pending",
  });
  revalidatePath("/partnerships");
  revalidatePath(`/brands/${to.slug}`);
  return { ok: true, message: `Request sent to ${to.name}.` };
}

/** Accept creates a Deal Room (partnership workspace) in the Discussion stage. */
export async function respondToRequest(requestId: string, decision: "Accepted" | "Declined" | "Question"): Promise<ActionResult> {
  const denied = deny("deal.accept");
  if (denied) return denied;
  const s = store();
  const req = s.requests.find((r) => r.id === requestId && r.toBrandId === CURRENT_BRAND_ID);
  if (!req) return { ok: false, error: "Request not found." };
  if (req.status === "Accepted" || req.status === "Declined") return { ok: false, error: "This request was already answered." };

  req.status = decision;
  if (decision === "Accepted") {
    const other = getBrand(req.fromBrandId)!;
    const me = getBrand(CURRENT_BRAND_ID)!;
    const now = new Date().toISOString();
    store().partnerships.unshift({
      id: newId("p"),
      name: `${me.name} × ${other.name}`,
      brandAId: me.id,
      brandBId: other.id,
      stage: "Discussion",
      createdAt: now,
      updatedAt: now,
      summary: req.idea,
      directions: [],
      proposalStatus: "None",
      owner: CURRENT_USER.name,
      nextStep: "Introduce your team and outline a proposal",
    });
  }
  revalidatePath("/partnerships");
  revalidatePath("/home");
  return { ok: true, message: decision === "Accepted" ? "Deal Room created." : decision === "Declined" ? "Request declined." : "Marked as awaiting your question." };
}

export async function applyToOpportunity(fd: FormData): Promise<ActionResult> {
  const denied = deny("connections.send");
  if (denied) return denied;
  const opp = getOpportunity(text(fd, "opportunityId", 64));
  if (!opp) return { ok: false, error: "Opportunity not found." };
  if (opp.brandId === CURRENT_BRAND_ID) return { ok: false, error: "You can't apply to your own opportunity." };
  if (opp.status === "Closed") return { ok: false, error: "This opportunity is closed." };
  const pitch = text(fd, "pitch", 1200);
  if (pitch.length < 20) return { ok: false, error: "Tell them why you're a fit (at least 20 characters)." };

  const owner = getBrand(opp.brandId)!;
  store().requests.unshift({
    id: newId("cr"),
    fromBrandId: CURRENT_BRAND_ID,
    toBrandId: owner.id,
    intro: `Applying to “${opp.title}”.`,
    idea: pitch,
    channelsOfInterest: [],
    structure: "Open to discuss",
    createdAt: new Date().toISOString(),
    status: "Pending",
  });
  opp.applicants += 1;
  revalidatePath("/opportunities");
  revalidatePath("/partnerships");
  return { ok: true, message: `Application sent to ${owner.name}.` };
}

const list = (fd: FormData, k: string, max = 12) =>
  text(fd, k, 600)
    .split(/[,\n]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);

export async function postOpportunity(fd: FormData): Promise<ActionResult> {
  const denied = deny("connections.send");
  if (denied) return denied;
  const title = text(fd, "title", 100);
  const concept = text(fd, "concept", 1200);
  const lookingFor = list(fd, "lookingFor");
  if (title.length < 4) return { ok: false, error: "Give the opportunity a title." };
  if (concept.length < 20) return { ok: false, error: "Describe the partnership concept (at least 20 characters)." };
  if (lookingFor.length === 0) return { ok: false, error: "List at least one type of brand you're looking for." };

  const models = fd
    .getAll("models")
    .map(String)
    .filter((m): m is CompensationModel => COMPENSATION_MODELS.includes(m as CompensationModel));

  store().opportunities.unshift({
    id: newId("opp"),
    brandId: CURRENT_BRAND_ID,
    title,
    summary: concept.length > 140 ? `${concept.slice(0, 137)}…` : concept,
    concept,
    lookingFor,
    offering: list(fd, "offering"),
    channelsWanted: list(fd, "channelsWanted"),
    models,
    postedAt: new Date().toISOString(),
    applicants: 0,
    status: "Open",
  });
  revalidatePath("/opportunities");
  return { ok: true, message: "Opportunity posted." };
}

/* ---------- Messaging ---------- */

export async function sendMessage(partnershipId: string, fd: FormData): Promise<ActionResult> {
  const denied = deny("messages.send");
  if (denied) return denied;
  const p = getPartnership(partnershipId);
  if (!p || (p.brandAId !== CURRENT_BRAND_ID && p.brandBId !== CURRENT_BRAND_ID)) return { ok: false, error: "Deal Room not found." };
  const body = text(fd, "body", 4000);
  if (!body) return { ok: false, error: "Write a message first." };
  const isNote = fd.get("kind") === "note";

  store().messages.push({
    id: newId("m"),
    partnershipId,
    authorName: CURRENT_USER.name,
    authorBrandId: CURRENT_BRAND_ID,
    body,
    createdAt: new Date().toISOString(),
    kind: isNote ? "note" : "message",
    mentions: [...body.matchAll(/@([A-Za-z]+)/g)].map((m) => m[1]!),
  });
  p.updatedAt = new Date().toISOString();
  revalidatePath(`/partnerships/${partnershipId}`);
  revalidatePath("/messages");
  return { ok: true };
}

/* ---------- Tracking links ---------- */

const LINK_KINDS: LinkKind[] = ["Standard", "Campaign", "Placement", "Product", "Deep link", "QR code"];

export async function createTrackingLink(fd: FormData): Promise<ActionResult<{ code: string }>> {
  const denied = deny("links.create");
  if (denied) return denied as ActionResult<{ code: string }>;

  const partnership = getPartnership(text(fd, "partnershipId", 64));
  const direction = partnership?.directions.find((d) => d.id === text(fd, "directionId", 64));
  if (!partnership || !direction) return { ok: false, error: "Choose a partnership and direction." };
  // Only a member of the partnership may mint links, and only for a direction it promotes in.
  if (direction.promoterId !== CURRENT_BRAND_ID) return { ok: false, error: "You can only create links for channels you contribute." };

  const destination = normalizeDestination(text(fd, "destination", 2000));
  if (!destination) return { ok: false, error: "Enter a valid destination URL, like meta.com/ai-glasses." };
  // The destination must belong to the paying brand, or the link could redirect traffic anywhere.
  const payer = getBrand(direction.payerId)!;
  const host = new URL(destination).hostname.replace(/^www\./, "");
  const payerHost = payer.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]!;
  if (host !== payerHost && !host.endsWith(`.${payerHost}`)) {
    return { ok: false, error: `Destination must be on ${payerHost}.` };
  }

  const kind = text(fd, "kind", 20) as LinkKind;
  if (!LINK_KINDS.includes(kind)) return { ok: false, error: "Choose a link type." };
  const channelId = text(fd, "channelId", 64);
  if (channelId && !direction.channelIds.includes(channelId)) return { ok: false, error: "That channel isn't part of this agreement." };
  const campaignName = text(fd, "campaignName", 80) || "General";
  const placement = text(fd, "placement", 120) || "Default";

  const s = store();
  let code = newLinkCode();
  while (s.links.some((l) => l.code === code)) code = newLinkCode();

  s.links.unshift({
    id: `lnk_${code}`,
    code,
    partnershipId: partnership.id,
    directionId: direction.id,
    promoterId: direction.promoterId,
    payerId: direction.payerId,
    campaignName,
    channelId: channelId || undefined,
    channelName: (channelId && getChannel(channelId)?.name) || "Direct",
    placement,
    creative: text(fd, "creative", 80) || undefined,
    kind,
    destination,
    createdAt: new Date().toISOString(),
    createdBy: CURRENT_USER.name,
    clicks: 0,
    conversions: 0,
    revenueCents: 0,
  });
  revalidatePath("/links");
  return { ok: true, data: { code } };
}

/* ---------- Deal proposals ---------- */

export interface ProposalInput {
  partnershipId: string;
  directions: {
    promoterId: string;
    channelIds: string[];
    compensation: Compensation;
    attribution: DealDirection["attribution"];
    rules: DealDirection["rules"];
    paymentTerms: DealDirection["paymentTerms"];
    customPaymentDays?: number;
  }[];
  action: "send" | "counter" | "accept";
}

export async function submitProposal(input: ProposalInput): Promise<ActionResult> {
  const denied = deny(input.action === "accept" ? "deal.accept" : "deal.negotiate");
  if (denied) return denied;
  const p = getPartnership(input.partnershipId);
  if (!p || (p.brandAId !== CURRENT_BRAND_ID && p.brandBId !== CURRENT_BRAND_ID)) return { ok: false, error: "Deal Room not found." };
  if (input.directions.length === 0) return { ok: false, error: "Add at least one direction to the proposal." };

  const members = [p.brandAId, p.brandBId];
  const next: DealDirection[] = [];
  for (const d of input.directions) {
    if (!members.includes(d.promoterId)) return { ok: false, error: "Invalid participating brand." };
    const payerId = members.find((m) => m !== d.promoterId)!;
    const c = d.compensation;
    if ((c.commissionBps ?? 0) < 0 || (c.commissionBps ?? 0) > 10_000) return { ok: false, error: "Commission must be between 0% and 100%." };
    for (const n of [c.cpaCents, c.cplCents, c.cpcCents, c.flatFeeCents]) {
      if (n !== undefined && (!Number.isInteger(n) || n < 0)) return { ok: false, error: "Amounts must be non-negative." };
    }
    if (!COMPENSATION_MODELS.includes(c.model)) return { ok: false, error: "Unknown compensation model." };
    if (d.attribution.windowDays < 1 || d.attribution.windowDays > 365) return { ok: false, error: "Attribution window must be 1–365 days." };
    next.push({
      id: p.directions.find((x) => x.promoterId === d.promoterId)?.id ?? newId("d"),
      promoterId: d.promoterId,
      payerId,
      channelIds: d.channelIds.filter((id) => getChannel(id)?.brandId === d.promoterId),
      compensation: c,
      attribution: d.attribution,
      rules: d.rules,
      paymentTerms: d.paymentTerms,
      customPaymentDays: d.customPaymentDays,
      currency: "USD",
    });
  }

  p.directions = next;
  p.proposalStatus = input.action === "accept" ? "Accepted" : input.action === "counter" ? "Countered" : "Sent";
  if (input.action === "accept" && (p.stage === "Discussion" || p.stage === "Proposal" || p.stage === "Terms")) p.stage = "Integration";
  else if (p.stage === "Discussion") p.stage = "Proposal";
  p.updatedAt = new Date().toISOString();

  store().messages.push({
    id: newId("m"),
    partnershipId: p.id,
    authorName: "System",
    authorBrandId: CURRENT_BRAND_ID,
    body: input.action === "accept" ? "Terms accepted. Moving to integration." : input.action === "counter" ? "A counter-proposal was submitted." : "A proposal was sent.",
    createdAt: p.updatedAt,
    kind: "system",
  });
  revalidatePath(`/partnerships/${p.id}`);
  revalidatePath("/partnerships");
  return { ok: true, message: input.action === "accept" ? "Terms accepted." : input.action === "counter" ? "Counter sent." : "Proposal sent." };
}

/* ---------- Brand profile & team ---------- */

const intOrUndef = (fd: FormData, k: string) => {
  const raw = text(fd, k, 20).replace(/[,\s]/g, "");
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < 1e12 ? n : NaN;
};

/** Every field is optional; only fields present in the form are updated. */
export async function updateBrandProfile(fd: FormData): Promise<ActionResult> {
  const denied = deny("profile.edit");
  if (denied) return denied;

  const metrics = ["monthlyCustomers", "monthlyTraffic", "appUsers", "emailSubscribers", "loyaltyMembers", "socialFollowing"] as const;
  const audience: Record<string, number | undefined> = {};
  for (const m of metrics) {
    const v = intOrUndef(fd, m);
    if (Number.isNaN(v)) return { ok: false, error: "Audience figures must be whole, non-negative numbers." };
    audience[m] = v;
  }

  const aov = Number(text(fd, "aov", 12).replace(/[$,\s]/g, ""));
  if (text(fd, "aov") && (!Number.isFinite(aov) || aov < 0)) return { ok: false, error: "Average order value must be a positive amount." };

  const models = fd
    .getAll("models")
    .map(String)
    .filter((m): m is CompensationModel => COMPENSATION_MODELS.includes(m as CompensationModel));

  const tagline = text(fd, "tagline", 140);
  const description = text(fd, "description", 1200);
  if (description.length < 20) return { ok: false, error: "Add a company description (at least 20 characters)." };

  saveBrandProfile(CURRENT_BRAND_ID, {
    tagline,
    description,
    headquarters: text(fd, "headquarters", 80),
    lookingFor: list(fd, "lookingFor"),
    partnershipModels: models,
    ...(text(fd, "aov") ? { averageOrderValueCents: Math.round(aov * 100) } : {}),
    audience: { primary: text(fd, "primaryAudience", 120), ...audience } as never,
  });
  revalidatePath("/brand-profile");
  revalidatePath("/discover");
  revalidatePath("/brands/lumen-labs");
  return { ok: true, message: "Profile saved." };
}

const ROLE_RANK: Record<Role, number> = { owner: 6, admin: 5, partnership_manager: 3, marketing_manager: 3, finance: 3, analyst: 2, read_only: 1 };

export async function inviteTeammate(fd: FormData): Promise<ActionResult> {
  const denied = deny("team.manage");
  if (denied) return denied;
  const email = text(fd, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  const role = text(fd, "role", 30) as Role;
  if (!(role in ROLE_RANK)) return { ok: false, error: "Choose a role." };
  // Nobody can grant a role above their own, and only owners can mint owners.
  if (ROLE_RANK[role] > ROLE_RANK[CURRENT_USER.role] || (role === "owner" && CURRENT_USER.role !== "owner")) {
    return { ok: false, error: "You can't assign a role higher than your own." };
  }
  const s = store();
  if (s.team.some((m) => m.email === email)) return { ok: false, error: "That person is already on your team." };
  s.team.push({ id: newId("u"), name: email.split("@")[0]!, email, role, status: "Invited" });
  revalidatePath("/settings");
  return { ok: true, message: `Invitation sent to ${email}.` };
}
