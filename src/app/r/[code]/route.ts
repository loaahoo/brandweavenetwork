import { NextResponse, type NextRequest } from "next/server";
import { store } from "@/lib/store";
import { newClickId, withClickId } from "@/lib/tracking";

/**
 * Click tracking: brandweavenetwork.com/r/ABC123
 * (Move to go.brandweavenetwork.com/ABC123 once the tracking subdomain is live.)
 *
 * Creates a Click with a unique click_id, then 302s to the destination with
 * `bw_click_id` appended so the receiving brand can send it back on conversion.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, ctx: RouteContext<"/r/[code]">) {
  const { code } = await ctx.params;
  const s = store();
  const link = s.links.find((l) => l.code === code);

  if (!link) {
    return new NextResponse("This link is no longer active.", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const clickId = newClickId();
  s.clicks.push({
    clickId,
    linkId: link.id,
    code: link.code,
    partnershipId: link.partnershipId,
    directionId: link.directionId,
    promoterId: link.promoterId,
    payerId: link.payerId,
    campaignId: link.campaignId,
    channelId: link.channelId,
    placement: link.placement,
    creative: link.creative,
    destination: link.destination,
    timestamp: new Date().toISOString(),
    country: request.headers.get("x-vercel-ip-country") ?? undefined,
    userAgent: request.headers.get("user-agent")?.slice(0, 256),
  });
  link.clicks += 1;

  return NextResponse.redirect(withClickId(link.destination, clickId), {
    status: 302,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer-when-downgrade" },
  });
}
