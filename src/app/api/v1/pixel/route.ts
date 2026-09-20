import { type NextRequest } from "next/server";
import { parseConversion } from "@/lib/conversions";
import { processConversion } from "@/lib/db/ledger";
import { db } from "@/lib/db/client";

/**
 * GET /api/v1/pixel?mid=<brand id>&click_id=clk_…&order_id=1042&revenue=129.50&currency=USD
 *
 * Tracking pixel for merchants that can't call the API yet. It is *unauthenticated*
 * (anyone can request an image), so transactions it creates are tagged
 * source="pixel" for review and it is documented as the fallback, not the target.
 * It always answers with a 1×1 GIF and never reveals why an event was rejected.
 */
export const dynamic = "force-dynamic";

// Smallest valid transparent GIF.
const GIF = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const brandId = q.get("mid") ?? "";

  // Only a real organization id is accepted as the reporting brand.
  if (/^[a-z0-9_-]{1,64}$/i.test(brandId) && (await db().organization.findUnique({ where: { id: brandId }, select: { id: true } }))) {
    const parsed = parseConversion(
      {
        order_id: q.get("order_id") ?? undefined,
        click_id: q.get("click_id") ?? undefined,
        revenue: q.get("revenue") ?? undefined,
        currency: q.get("currency") ?? undefined,
        customer_type: q.get("customer_type") ?? undefined,
        country: q.get("country") ?? undefined,
      },
      "pixel",
    );
    if (parsed.ok) {
      // Never let a database error change the response: a pixel always answers with the GIF.
      await processConversion(parsed.event, brandId).catch(() => {});
    }
  }

  return new Response(GIF, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0", "Content-Length": String(GIF.length) },
  });
}
