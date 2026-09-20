import type { Metadata } from "next";
import { headers } from "next/headers";
import { Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { CURRENT_BRAND_ID } from "@/lib/data/brands";
import { INTEGRATIONS } from "@/lib/data/ledger";

export const metadata: Metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

function Code({ children, label }: { children: string; label: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-slate-500">{label}</div>
      <pre className="scrollbar-thin overflow-x-auto rounded-xl bg-ink p-4 font-mono text-[12.5px] leading-relaxed text-slate-100">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default async function IntegrationsPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "brandweavenetwork.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const key = `bw_test_${CURRENT_BRAND_ID}_demo`;

  const groups = ["Tracking", "Commerce", "Payments", "Data"] as const;

  return (
    <>
      <PageHeader title="Integrations" description="Send Brand Weave the orders your partners drive. Server-side is preferred; the pixel is the quickest way to start." />

      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g} aria-labelledby={`int-${g}`}>
            <h2 id={`int-${g}`} className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              {g}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {INTEGRATIONS.filter((i) => i.category === g).map((i) => (
                <Card key={i.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15px] font-semibold tracking-tight text-ink">{i.name}</h3>
                    <StatusBadge status={i.status} />
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{i.description}</p>
                </Card>
              ))}
            </div>
          </section>
        ))}

        <Card>
          <CardHeader title="Conversion API" description="Report each order with the click ID that was passed to your site as bw_click_id." />
          <div className="space-y-5 p-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This is a <strong>demo test key</strong> for the sandbox. Production keys are shown once, stored hashed, and scoped to your organization.
              <code className="mt-1.5 block font-mono text-[13px]">{key}</code>
            </div>
            <Code label="Send a conversion">{`curl -X POST ${origin}/api/v1/conversions \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "1042",
    "click_id": "clk_…",
    "revenue": 349.00,
    "currency": "USD",
    "customer_type": "new",
    "country": "US",
    "items": [{ "sku": "GLASSES", "price": 349.00, "quantity": 1 }]
  }'`}</Code>
            <Code label="Or fire the tracking pixel on your confirmation page">{`<img src="${origin}/api/v1/pixel?mid=${CURRENT_BRAND_ID}&click_id=clk_…&order_id=1042&revenue=349.00&currency=USD"
     width="1" height="1" alt="" style="display:none" />`}</Code>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-slate-600">
              <li>Re-sending the same <code className="font-mono">order_id</code> is safe: the original transaction is returned.</li>
              <li>You can only report conversions for clicks on links where your brand is the paying brand.</li>
              <li>The pixel can&apos;t authenticate the sender, so pixel transactions are tagged <code className="font-mono">source: pixel</code> for review. Prefer the API.</li>
            </ul>
          </div>
        </Card>
      </div>
    </>
  );
}
