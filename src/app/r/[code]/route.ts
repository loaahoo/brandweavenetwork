import { NextResponse, type NextRequest } from "next/server";
import { recordClick } from "@/lib/db/ledger";
import { withClickId } from "@/lib/tracking";

/**
 * Click tracking: brandweavenetwork.com/r/ABC123
 * (Move to go.brandweavenetwork.com/ABC123 once the tracking subdomain is live.)
 *
 * Creates a Click with a unique click_id, then 302s to the destination with
 * `bw_click_id` appended so the receiving brand can send it back on conversion.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest, ctx: RouteContext<"/r/[code]">) {
  const { code } = await ctx.params;
  // Link codes are short and alphanumeric; reject anything else before touching the database.
  if (!/^[A-Za-z0-9]{4,16}$/.test(code)) return new NextResponse("This link is no longer active.", { status: 404, headers: NO_STORE });

  const click = await recordClick(code, {
    country: request.headers.get("x-vercel-ip-country") ?? undefined,
    userAgent: request.headers.get("user-agent")?.slice(0, 256),
  });
  if (!click) return new NextResponse("This link is no longer active.", { status: 404, headers: NO_STORE });

  return NextResponse.redirect(withClickId(click.destination, click.clickId), {
    status: 302,
    headers: { ...NO_STORE, "Referrer-Policy": "no-referrer-when-downgrade" },
  });
}
