import { NextResponse, type NextRequest } from "next/server";
import { parseConversion, processConversion, type ConversionInput } from "@/lib/conversions";
import { store } from "@/lib/store";

/**
 * POST /api/v1/conversions — server-side conversion API (preferred integration).
 *
 *   Authorization: Bearer <api key>
 *   { "order_id": "1042", "click_id": "clk_…", "revenue": 129.5, "currency": "USD",
 *     "customer_type": "new", "country": "US", "timestamp": "2026-09-19T15:00:00Z",
 *     "items": [{ "sku": "GLASSES", "price": 129.5, "quantity": 1 }] }
 *
 * Idempotent on order_id: re-sending an order returns the original transaction.
 */
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const brandId = key ? store().apiKeys.get(key) : undefined;
  if (!brandId) return json({ error: { code: "unauthorized", message: "Missing or invalid API key." } }, 401);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return json({ error: { code: "payload_too_large", message: "Body exceeds 64 KB." } }, 413);

  let body: ConversionInput;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json({ error: { code: "payload_too_large", message: "Body exceeds 64 KB." } }, 413);
    body = JSON.parse(text);
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error("not an object");
  } catch {
    return json({ error: { code: "invalid_json", message: "Request body must be a JSON object." } }, 400);
  }

  const parsed = parseConversion(body, "api");
  if (!parsed.ok) return json({ error: { code: "invalid_request", message: "Validation failed.", details: parsed.errors } }, 400);

  const outcome = processConversion(parsed.event, brandId);
  switch (outcome.kind) {
    case "created":
      return json({ attributed: true, duplicate: false, transaction: publicTx(outcome.transaction) }, 201);
    case "duplicate":
      return json({ attributed: true, duplicate: true, transaction: publicTx(outcome.transaction) }, 200);
    case "unattributed":
      return json({ attributed: false, reasons: outcome.reasons }, 200);
    case "unknown_click":
      return json({ error: { code: "unknown_click", message: "No click found for click_id." } }, 404);
    case "forbidden":
      return json({ error: { code: "forbidden", message: "This click does not belong to your brand's agreements." } }, 403);
  }
}

function publicTx(t: ReturnType<typeof store>["transactions"][number]) {
  return {
    id: t.id,
    order_id: t.orderId,
    status: t.status,
    sale: t.saleCents / 100,
    commission: t.commissionCents / 100,
    currency: t.currency,
    partnership_id: t.partnershipId,
    created_at: t.date,
  };
}
