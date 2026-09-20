import { FileImage, Link2, QrCode } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { LinkGenerator, type GeneratorOption } from "@/components/platform/link-generator";
import { Badge, Card, CardHeader, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { CURRENT_BRAND_ID, getBrand } from "@/lib/data/brands";
import { getChannel } from "@/lib/data/channels";
import { assetsFor, currentBrand, linksFor, myPartnerships } from "@/lib/queries";
import { formatDate, formatMoney, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Links & Assets" };
export const dynamic = "force-dynamic";

export default async function LinksPage({ searchParams }: PageProps<"/links">) {
  const sp = await searchParams;
  const tab = sp.tab === "assets" ? "assets" : "links";
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "brandweavenetwork.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const me = currentBrand();
  const links = (await linksFor()).filter((l) => l.promoterId === CURRENT_BRAND_ID);
  const assets = assetsFor(me.id);

  const options: GeneratorOption[] = myPartnerships().flatMap((p) =>
    p.directions
      .filter((d) => d.promoterId === CURRENT_BRAND_ID)
      .map((d) => {
        const payer = getBrand(d.payerId)!;
        return {
          partnershipId: p.id,
          partnershipName: p.name,
          directionId: d.id,
          payerName: payer.name,
          payerHost: payer.website.replace(/^https?:\/\//, ""),
          channels: d.channelIds.map((id) => ({ id, name: getChannel(id)?.name ?? id })),
        };
      }),
  );

  const qrs = tab === "links" ? await Promise.all(links.map((l) => QRCode.toDataURL(`${origin}/r/${l.code}`, { margin: 1, width: 240 }))) : [];

  return (
    <>
      <PageHeader title="Links & Assets" description="Create trackable links for the channels you contribute, and keep approved creative in one place." />

      <div role="tablist" className="mb-6 inline-flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
        {[
          ["links", "Tracking Links"],
          ["assets", "Assets"],
        ].map(([id, label]) => (
          <Link key={id} role="tab" aria-selected={tab === id} href={id === "links" ? "/links" : "/links?tab=assets"} className={`rounded-md px-3.5 py-1.5 ${tab === id ? "bg-white text-ink shadow-card" : "text-slate-500 hover:text-slate-800"}`}>
            {label}
          </Link>
        ))}
      </div>

      {tab === "links" ? (
        <div className="space-y-6">
          <LinkGenerator options={options} />

          <Card>
            <CardHeader title="Your tracking links" description="Links you created for partners' offers. Clicks are recorded with a unique click ID." />
            {links.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<Link2 />} title="No tracking links yet" description="Create your first link above to start attributing sales." />
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Link</Th>
                    <Th>Partner</Th>
                    <Th>Campaign</Th>
                    <Th>Channel · placement</Th>
                    <Th className="text-right">Clicks</Th>
                    <Th className="text-right">Conv.</Th>
                    <Th className="text-right">Revenue</Th>
                    <Th>QR</Th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((l, i) => (
                    <tr key={l.id} className="hover:bg-slate-50/60">
                      <Td>
                        <code className="font-mono text-xs text-slate-800">{`${host}/r/${l.code}`}</code>
                        <div className="max-w-xs truncate text-xs text-slate-400">→ {l.destination.replace(/^https?:\/\//, "")}</div>
                      </Td>
                      <Td>{getBrand(l.payerId)?.name}</Td>
                      <Td>
                        {l.campaignName}
                        <div className="mt-0.5">
                          <Badge>{l.kind}</Badge>
                        </div>
                      </Td>
                      <Td>
                        {l.channelName}
                        <div className="text-xs text-slate-400">{l.placement}</div>
                      </Td>
                      <Td className="text-right tabular-nums">{formatNumber(l.clicks)}</Td>
                      <Td className="text-right tabular-nums">{formatNumber(l.conversions)}</Td>
                      <Td className="text-right tabular-nums">{formatMoney(l.revenueCents, "USD", { compact: true })}</Td>
                      <Td>
                        <details className="relative">
                          <summary className="flex cursor-pointer list-none items-center text-slate-500 hover:text-brand-700" aria-label={`QR code for ${l.code}`}>
                            <QrCode className="size-4" />
                          </summary>
                          <div className="absolute right-0 z-20 mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-raised">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrs[i]} alt={`QR code for ${origin}/r/${l.code}`} width={140} height={140} />
                          </div>
                        </details>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader title="Brand assets" description="Approved assets are available to partners inside your Deal Rooms." />
          {assets.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<FileImage />} title="No assets yet" description="Upload logos, product images, guidelines, banners, copy, offers and promo codes." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {assets.map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <FileImage className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">{a.name}</div>
                    <div className="text-xs text-slate-500">
                      {a.detail} · updated {formatDate(a.updatedAt, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <Badge>{a.kind}</Badge>
                  <Badge tone={a.approved ? "green" : "amber"}>{a.approved ? "Approved" : "Pending approval"}</Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">File uploads arrive with object storage (S3-compatible); assets are listed from seed data for now.</div>
        </Card>
      )}
    </>
  );
}
