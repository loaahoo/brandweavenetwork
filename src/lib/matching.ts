/**
 * Brand Matches v1 — transparent, rule-based.
 *
 * Every match carries the *reasons* it was made, not just a score, so the UI can
 * explain why two brands fit. This is the interface a later AI matcher will
 * implement; the reasons array is what it will enrich.
 */
import type { Directory } from "./db/directory";
import type { Brand, Channel } from "./types";

export interface BrandMatch {
  brand: Brand;
  score: number;
  fit: "Strong fit" | "Good fit" | "Emerging fit";
  reasons: string[];
  /** Channels on the other brand that suit `me`. */
  theirChannels: Channel[];
  /** Channels on `me` that suit the other brand. */
  myChannels: Channel[];
  concept: string;
}

const STOP = new Set(["platforms", "platform", "technology", "tech", "and", "the", "gear", "goods", "brands", "services", "service"]);
const stems = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !STOP.has(w))
    .map((w) => w.slice(0, 5));

const bag = (b: Brand) => new Set(stems([b.industry, b.subcategory, b.name, ...b.productCategories].join(" ")));

/** Which of `wants` phrases does the target brand satisfy? */
function satisfied(wants: string[], target: Brand): string[] {
  const t = bag(target);
  return wants
    .map((w) => {
      const s = stems(w);
      return { w, hits: s.filter((x) => t.has(x)).length, n: s.length };
    })
    .filter((x) => x.hits > 0)
    // Most words matched first; then the more specific (shorter) phrase, so "Hotels" beats "Travel booking platforms".
    .sort((a, b) => b.hits - a.hits || a.n - b.n)
    .map((x) => x.w);
}

const CONCEPTS: Record<string, string> = {
  "Technology|Travel & Hospitality": "Hands-free travel companion: capture, translate and navigate from the moment a trip is booked.",
  "Entertainment|Technology": "Hands-free concert capture and enhanced event experiences from ticket to encore.",
  "Fitness & Wellness|Technology": "Workout and recovery tracking bundled into the member experience.",
  "Beauty|Fitness & Wellness": "A self-care routine that spans training, recovery and skincare.",
  "Automotive|Travel & Hospitality": "Road-trip planning that connects the vehicle to stays, gear and experiences.",
  "Financial Services|Travel & Hospitality": "Rewards and financing at the moment of booking.",
  "Retail & Outdoor|Travel & Hospitality": "Gear for the trip, offered when the trip is planned.",
  "Insurance|Travel & Hospitality": "Protection offered at booking, when travelers are most receptive.",
  "Retail & Outdoor|Technology": "Try-and-buy tech for adventures, in store and online.",
  "Telecommunications|Travel & Hospitality": "Connectivity ready before wheels-up.",
  "Telecommunications|Technology": "Connectivity that makes a device work anywhere on day one.",
  "Insurance|Technology": "Device protection at the point of purchase.",
};

const concept = (a: Brand, b: Brand) =>
  CONCEPTS[[a.industry, b.industry].sort().join("|")] ??
  `Reach ${b.audience.primary.toLowerCase()} at the moments that matter, in exchange for relevant value for ${a.audience.primary.toLowerCase()}.`;

export function matchBrands(me: Brand, dir: Directory, opts: { limit?: number; among?: Brand[] } = {}): BrandMatch[] {
  const { limit = 12, among = dir.brands } = opts;
  const all = among;
  const channelsForBrand = dir.channelsFor;
  const myChannels = channelsForBrand(me.id);

  return all
    .filter((b) => b.id !== me.id)
    .map((other): BrandMatch => {
      const reasons: string[] = [];
      let score = 0;

      // 1. Do they satisfy what I'm looking for (and vice-versa)?
      const iWant = satisfied(me.lookingFor, other);
      const theyWant = satisfied(other.lookingFor, me);
      if (iWant.length) {
        score += 26;
        reasons.push(`You're looking for ${iWant[0]!.toLowerCase()} — ${other.name} is in ${other.subcategory.toLowerCase()}.`);
      }
      if (theyWant.length) {
        score += 26;
        reasons.push(`${other.name} is looking for ${theyWant[0]!.toLowerCase()}, which is what ${me.name} offers.`);
      }

      // 2. Audience overlap (segments + interests).
      const seg = other.audience.segments.filter((s) => me.audience.segments.includes(s));
      const interests = other.audience.interests.filter((i) => me.audience.interests.includes(i));
      if (seg.length) {
        score += Math.min(16, seg.length * 8);
        reasons.push(`Shared customer segment: ${seg.slice(0, 2).join(", ")}.`);
      } else if (interests.length) {
        score += Math.min(10, interests.length * 5);
        reasons.push(`Customers share an interest in ${interests.slice(0, 2).join(" and ").toLowerCase()}.`);
      }

      // 3. Geography.
      const geo = other.markets.filter((m) => me.markets.includes(m) || m === "Global");
      if (geo.length) {
        score += 8;
        reasons.push(`Overlapping markets: ${geo.slice(0, 3).join(", ")}.`);
      }

      // 4. Channels that fit each way.
      const theirs = channelsForBrand(other.id).filter(
        (c) => c.status !== "Paused" && c.desiredPartnerCategories.some((d) => stems(d).some((s) => bag(me).has(s))),
      );
      const mine = myChannels.filter((c) => c.desiredPartnerCategories.some((d) => stems(d).some((s) => bag(other).has(s))));
      if (theirs.length) {
        score += 14;
        reasons.push(`${other.name} has ${theirs.length} channel${theirs.length > 1 ? "s" : ""} open to your category, such as ${theirs[0]!.name.toLowerCase()}.`);
      }
      if (mine.length) {
        score += 8;
        reasons.push(`Your ${mine[0]!.name.toLowerCase()} suits ${other.name}'s customers.`);
      }

      // 5. Compatible commercial models.
      const models = other.partnershipModels.filter((m) => me.partnershipModels.includes(m));
      if (models.length) {
        score += 6;
        reasons.push(`Both open to ${models.slice(0, 2).join(" and ")}.`);
      }

      score = Math.min(99, score);
      return {
        brand: other,
        score,
        fit: score >= 75 ? "Strong fit" : score >= 45 ? "Good fit" : "Emerging fit",
        reasons,
        theirChannels: theirs,
        myChannels: mine,
        concept: concept(me, other),
      };
    })
    .filter((m) => m.score >= 25)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
