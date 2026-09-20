/**
 * Tracking primitives.
 *
 * Flow: a partner clicks a BrandWeave URL → we create a Click with a unique
 * click_id → redirect to the destination with `bw_click_id` appended → the
 * receiving brand stores that id and sends it back with the order → the
 * conversion is joined to the click and the commission engine runs.
 */
import { randomBytes } from "node:crypto";

/** No 0/O/1/I/l to keep codes readable when typed from print or QR fallbacks. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function randomString(length: number, alphabet = ALPHABET) {
  // Rejection sampling avoids modulo bias.
  const max = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte >= max) continue;
      out += alphabet[byte % alphabet.length];
      if (out.length === length) break;
    }
  }
  return out;
}

export const newLinkCode = () => randomString(7);
export const newClickId = () => `clk_${randomString(24)}`;
export const newId = (prefix: string) => `${prefix}_${randomString(14)}`;

export const CLICK_PARAM = "bw_click_id";

/** The public tracking URL. Swap the host for go.brandweavenetwork.com once the subdomain is live. */
export function trackingUrl(code: string, origin = "https://brandweavenetwork.com") {
  return `${origin}/r/${code}`;
}

export function withClickId(destination: string, clickId: string): string {
  const url = new URL(destination);
  url.searchParams.set(CLICK_PARAM, clickId);
  return url.toString();
}

/** Normalise user input ("meta.com/ai-glasses") into an absolute https URL, or null if unusable. */
export function normalizeDestination(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}
