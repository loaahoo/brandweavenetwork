"use server";

import { revalidatePath } from "next/cache";
import { can, COMPENSATION_MODELS, type Permission } from "@/lib/constants";
import { CURRENT_BRAND_ID } from "@/lib/data/brands";
import { CURRENT_USER } from "@/lib/data/ledger";
import { getDirectory, updateBrandProfile as saveBrandProfile } from "@/lib/db/directory";
import { createTrackingLink as createLinkRecord } from "@/lib/db/ledger";
import * as network from "@/lib/db/network";
import { normalizeDestination } from "@/lib/tracking";
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

const list = (fd: FormData, k: string, max = 12) =>
  text(fd, k, 600)
    .split(/[,\n]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);

const validModel = (m: string): m is CompensationModel => COMPENSATION_MODELS.includes(m as CompensationModel);

/* ---------- Connection requests ---------- */

export async function sendConnectionRequest(fd: FormData): Promise<ActionResult> {
  const denied = deny("connections.send");
  if (denied) return denied;

  const dir = await getDirectory();
  const to = dir.brand(text(fd, "toBrandId", 64));
  if (!to || to.id === CURRENT_BRAND_ID) return { ok: false, error: "That brand can't be found." };

  const intro = text(fd, "intro", 600);
  const idea = text(fd, "idea", 1200);
  if (intro.length < 10) return { ok: false, error: "Add a short introduction (at least 10 characters)." };
  if (idea.length < 10) return { ok: false, error: "Describe your partnership idea (at least 10 characters)." };

  const structure = text(fd, "structure", 32);
  if (structure !== "Open to discuss" && !validModel(structure)) return { ok: false, error: "Choose a valid commercial structure." };

  const result = await network.createConnectionRequest({
    from: CURRENT_BRAND_ID,
    to: to.id,
    intro,
    idea,
    channelIds: fd.getAll("channels").map(String),
    structure,
  });
  if (!result.ok) return { ok: false, error: result.error.replace("this brand", to.name) };
  revalidatePath("/partnerships");
  revalidatePath(`/brands/${to.slug}`);
  return { ok: true, message: `Request sent to ${to.name}.` };
}

/** Accept creates a Deal Room (partnership workspace) in the Discussion stage. */
export async function respondToRequest(requestId: string, decision: "Accepted" | "Declined" | "Question"): Promise<ActionResult> {
  const denied = deny("deal.accept");
  if (denied) return denied;
  if (!["Accepted", "Declined", "Question"].includes(decision)) return { ok: false, error: "Unknown decision." };

  const result = await network.respondToRequest({ requestId, me: CURRENT_BRAND_ID, decision, ownerName: CURRENT_USER.name });
  if (!result.ok) return result;
  revalidatePath("/partnerships");
  revalidatePath("/home");
  return { ok: true, message: result.message };
}

/* ---------- Opportunities ---------- */

export async function applyToOpportunity(fd: FormData): Promise<ActionResult> {
  const denied = deny("connections.send");
  if (denied) return denied;
  const pitch = text(fd, "pitch", 1200);
  if (pitch.length < 20) return { ok: false, error: "Tell them why you're a fit (at least 20 characters)." };

  const result = await network.applyToOpportunity({ from: CURRENT_BRAND_ID, opportunityId: text(fd, "opportunityId", 64), pitch });
  if (!result.ok) return result;
  const owner = (await getDirectory()).brand(result.brandId);
  revalidatePath("/opportunities");
  revalidatePath("/partnerships");
  return { ok: true, message: `Application sent to ${owner?.name ?? "the brand"}.` };
}

export async function postOpportunity(fd: FormData): Promise<ActionResult> {
  const denied = deny("connections.send");
  if (denied) return denied;
  const title = text(fd, "title", 100);
  const concept = text(fd, "concept", 1200);
  const lookingFor = list(fd, "lookingFor");
  if (title.length < 4) return { ok: false, error: "Give the opportunity a title." };
  if (concept.length < 20) return { ok: false, error: "Describe the partnership concept (at least 20 characters)." };
  if (lookingFor.length === 0) return { ok: false, error: "List at least one type of brand you're looking for." };

  await network.createOpportunity({
    organizationId: CURRENT_BRAND_ID,
    title,
    concept,
    lookingFor,
    offering: list(fd, "offering"),
    channelsWanted: list(fd, "channelsWanted"),
    models: fd.getAll("models").map(String).filter(validModel),
  });
  revalidatePath("/opportunities");
  return { ok: true, message: "Opportunity posted." };
}

/* ---------- Messaging ---------- */

export async function sendMessage(partnershipId: string, fd: FormData): Promise<ActionResult> {
  const denied = deny("messages.send");
  if (denied) return denied;
  const body = text(fd, "body", 4000);
  if (!body) return { ok: false, error: "Write a message first." };

  const result = await network.postMessage({
    partnershipId,
    me: CURRENT_BRAND_ID,
    authorName: CURRENT_USER.name,
    body,
    note: fd.get("kind") === "note",
    mentions: [...body.matchAll(/@([A-Za-z]+)/g)].map((m) => m[1]!),
  });
  if (!result.ok) return result;
  revalidatePath(`/partnerships/${partnershipId}`);
  revalidatePath("/messages");
  return { ok: true };
}

/* ---------- Tracking links ---------- */

const LINK_KINDS: LinkKind[] = ["Standard", "Campaign", "Placement", "Product", "Deep link", "QR code"];

export async function createTrackingLink(fd: FormData): Promise<ActionResult<{ code: string }>> {
  const denied = deny("links.create");
  if (denied) return denied as ActionResult<{ code: string }>;

  const destination = normalizeDestination(text(fd, "destination", 2000));
  if (!destination) return { ok: false, error: "Enter a valid destination URL, like meta.com/ai-glasses." };

  const kind = text(fd, "kind", 20) as LinkKind;
  if (!LINK_KINDS.includes(kind)) return { ok: false, error: "Choose a link type." };

  const dir = await getDirectory();
  // The agreement in the database is the source of truth for who may promote what.
  const result = await createLinkRecord({
    agreementId: text(fd, "directionId", 64),
    promoterId: CURRENT_BRAND_ID,
    campaignName: text(fd, "campaignName", 80) || "General",
    channelId: text(fd, "channelId", 64) || undefined,
    placement: text(fd, "placement", 120) || "Default",
    creative: text(fd, "creative", 80) || undefined,
    kind,
    destination,
    createdById: CURRENT_USER.id,
    // The destination must belong to the paying brand, or the link could redirect traffic anywhere.
    validateDestination: (payerId) => {
      const payer = dir.brand(payerId);
      if (!payer) return "Unknown paying brand.";
      const host = new URL(destination).hostname.replace(/^www\./, "");
      const payerHost = payer.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]!;
      return host === payerHost || host.endsWith(`.${payerHost}`) ? null : `Destination must be on ${payerHost}.`;
    },
  });
  if (!result.ok) return result;
  revalidatePath("/links");
  return { ok: true, data: { code: result.code } };
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
  action: network.ProposalAction;
}

/**
 * send / counter record a proposal without touching live terms; accept applies the stored open proposal
 * (not the caller's form) and only the side that didn't propose it may accept.
 */
export async function submitProposal(input: ProposalInput): Promise<ActionResult> {
  const denied = deny(input.action === "accept" ? "deal.accept" : "deal.negotiate");
  if (denied) return denied;
  if (!["send", "counter", "accept"].includes(input.action)) return { ok: false, error: "Unknown action." };

  const [dir, partnership] = await Promise.all([getDirectory(), network.getPartnership(input.partnershipId, CURRENT_BRAND_ID)]);
  if (!partnership) return { ok: false, error: "Deal Room not found." };

  const members = [partnership.brandAId, partnership.brandBId];
  const directions: DealDirection[] = [];
  if (input.action !== "accept") {
    if (input.directions.length === 0) return { ok: false, error: "Add at least one direction to the proposal." };
    for (const d of input.directions) {
      if (!members.includes(d.promoterId)) return { ok: false, error: "Invalid participating brand." };
      const c = d.compensation;
      if ((c.commissionBps ?? 0) < 0 || (c.commissionBps ?? 0) > 10_000) return { ok: false, error: "Commission must be between 0% and 100%." };
      for (const n of [c.cpaCents, c.cplCents, c.cpcCents, c.flatFeeCents]) {
        if (n !== undefined && (!Number.isInteger(n) || n < 0)) return { ok: false, error: "Amounts must be non-negative." };
      }
      if (!validModel(c.model)) return { ok: false, error: "Unknown compensation model." };
      if (!(d.attribution.windowDays >= 1 && d.attribution.windowDays <= 365)) return { ok: false, error: "Attribution window must be 1–365 days." };
      directions.push({
        id: `proposed_${d.promoterId}`,
        promoterId: d.promoterId,
        payerId: members.find((m) => m !== d.promoterId)!,
        // Only channels the promoting brand actually lists can be part of its side of the deal.
        channelIds: d.channelIds.filter((id) => dir.channel(id)?.brandId === d.promoterId),
        compensation: c,
        attribution: d.attribution,
        rules: d.rules,
        paymentTerms: d.paymentTerms,
        customPaymentDays: d.customPaymentDays,
        currency: "USD",
      });
    }
  }

  const result = await network.submitProposal({
    partnershipId: input.partnershipId,
    me: CURRENT_BRAND_ID,
    authorName: CURRENT_USER.name,
    action: input.action,
    directions,
  });
  if (!result.ok) return result;
  revalidatePath(`/partnerships/${input.partnershipId}`);
  revalidatePath("/partnerships");
  return { ok: true, message: result.message };
}

/* ---------- Brand profile & team ---------- */

const intOrUndef = (fd: FormData, k: string) => {
  const raw = text(fd, k, 20).replace(/[,\s]/g, "");
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < 2_000_000_000 ? n : NaN;
};

export async function updateBrandProfile(fd: FormData): Promise<ActionResult> {
  const denied = deny("profile.edit");
  if (denied) return denied;

  const metrics = ["monthlyCustomers", "monthlyTraffic", "appUsers", "emailSubscribers", "loyaltyMembers", "socialFollowing"] as const;
  const audience: Partial<Record<(typeof metrics)[number], number | undefined>> = {};
  for (const m of metrics) {
    const v = intOrUndef(fd, m);
    if (Number.isNaN(v)) return { ok: false, error: "Audience figures must be whole, non-negative numbers." };
    audience[m] = v;
  }

  const aovRaw = text(fd, "aov", 12).replace(/[$,\s]/g, "");
  const aov = aovRaw ? Number(aovRaw) : undefined;
  if (aov !== undefined && (!Number.isFinite(aov) || aov < 0)) return { ok: false, error: "Average order value must be a positive amount." };

  const description = text(fd, "description", 1200);
  if (description.length < 20) return { ok: false, error: "Add a company description (at least 20 characters)." };

  await saveBrandProfile(CURRENT_BRAND_ID, {
    tagline: text(fd, "tagline", 140),
    description,
    headquarters: text(fd, "headquarters", 80),
    lookingFor: list(fd, "lookingFor"),
    partnershipModels: fd.getAll("models").map(String).filter(validModel),
    averageOrderValueCents: aov !== undefined ? Math.round(aov * 100) : undefined,
    primaryAudience: text(fd, "primaryAudience", 120),
    audience,
  });
  const brand = (await getDirectory()).brand(CURRENT_BRAND_ID);
  revalidatePath("/brand-profile");
  revalidatePath("/discover");
  if (brand) revalidatePath(`/brands/${brand.slug}`);
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
  const result = await network.inviteMember({ organizationId: CURRENT_BRAND_ID, email, role });
  if (!result.ok) return result;
  revalidatePath("/settings");
  return { ok: true, message: `Invitation sent to ${email}.` };
}
