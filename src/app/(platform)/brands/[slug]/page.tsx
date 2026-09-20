import { ArrowLeft, BadgeCheck, Globe, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandAvatar } from "@/components/brand/brand-avatar";
import { ChannelCard } from "@/components/platform/cards";
import { RequestPartnershipDialog } from "@/components/platform/request-dialog";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, CardHeader, Chip } from "@/components/ui/primitives";
import { getDirectory } from "@/lib/db/directory";
import { listPartnerships, listRequests } from "@/lib/db/network";
import { matchBrands } from "@/lib/matching";
import { currentBrand } from "@/lib/queries";
import { formatMoney, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/brands/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: (await getDirectory()).brandBySlug(slug)?.name ?? "Brand" };
}

export default async function BrandPage({ params }: PageProps<"/brands/[slug]">) {
  const { slug } = await params;
  const dir = await getDirectory();
  const brand = dir.brandBySlug(slug);
  if (!brand) notFound();

  const me = currentBrand(dir);
  const isMe = brand.id === me.id;
  const channels = dir.channelsFor(brand.id);
  const match = isMe ? undefined : matchBrands(me, dir, { among: [brand], limit: 1 })[0];
  const [partnerships, { outgoing }] = await Promise.all([listPartnerships(me.id), listRequests(me.id)]);
  const partnership = partnerships.find((p) => p.brandAId === brand.id || p.brandBId === brand.id);
  const pending = outgoing.find((r) => r.toBrandId === brand.id && r.status === "Pending");
  const a = brand.audience;

  const metrics: [string, number | undefined][] = [
    ["Monthly customers", a.monthlyCustomers],
    ["Monthly site traffic", a.monthlyTraffic],
    ["App users", a.appUsers],
    ["Email subscribers", a.emailSubscribers],
    ["Loyalty members", a.loyaltyMembers],
    ["Social following", a.socialFollowing],
  ];

  return (
    <>
      <Link href="/discover" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> Discover
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <BrandAvatar brand={brand} size="xl" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{brand.name}</h1>
                {brand.verified && <BadgeCheck className="size-5 text-brand-500" aria-label="Verified brand" />}
              </div>
              <p className="mt-1 text-[15px] text-slate-600">{brand.tagline}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {brand.headquarters}
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="size-3.5" /> {brand.website}
                </span>
                <Badge>{brand.industry}</Badge>
                <Badge>{brand.businessType}</Badge>
                <Badge>{brand.size}</Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {isMe ? (
              <ButtonLink href="/brand-profile" variant="secondary">
                Edit brand profile
              </ButtonLink>
            ) : partnership ? (
              <ButtonLink href={`/partnerships/${partnership.id}`} variant="brand">
                Open Deal Room
              </ButtonLink>
            ) : pending ? (
              <Badge tone="amber" className="px-3 py-1.5 text-[13px]">
                Request pending
              </Badge>
            ) : (
              <RequestPartnershipDialog brandId={brand.id} brandName={brand.name} channels={channels} />
            )}
            <span className="text-xs text-slate-500">{brand.activePartnerships > 0 ? `${brand.activePartnerships} live partnership${brand.activePartnerships === 1 ? "" : "s"} on Brand Weave` : "No live partnerships yet"}</span>
          </div>
        </div>
      </Card>

      {match && (
        <Card className="mt-6 border-brand-200 bg-brand-50/50 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink">Why {me.name} × {brand.name}</h2>
            <Badge tone={match.fit === "Strong fit" ? "green" : "brand"}>{match.fit}</Badge>
          </div>
          <p className="mt-2 text-[15px] font-medium text-slate-800">{match.concept}</p>
          <ul className="mt-3 grid gap-x-8 gap-y-1.5 text-sm text-slate-600 md:grid-cols-2">
            {match.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-brand-500" />
                {r}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="About" />
            <div className="space-y-4 p-5 text-[15px] leading-relaxed text-slate-600">
              <p>{brand.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {brand.productCategories.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
              </div>
              <dl className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-slate-500">Average order value</dt>
                  <dd className="mt-0.5 font-semibold text-ink">{formatMoney(brand.averageOrderValueCents)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Business model</dt>
                  <dd className="mt-0.5 text-slate-800">{brand.businessModel}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Presence</dt>
                  <dd className="mt-0.5 text-slate-800">{brand.presence}</dd>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-xs text-slate-500">Markets</dt>
                  <dd className="mt-0.5 text-slate-800">{brand.markets.join(", ")}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <section aria-labelledby="channels-h">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="channels-h" className="text-lg font-semibold tracking-tight text-ink">
                Available Channels
              </h2>
              <span className="text-[13px] text-slate-500">Marketing surfaces {brand.name} will make available to partners</span>
            </div>
            {channels.length === 0 ? (
              <Card className="p-6 text-sm text-slate-500">{brand.name} hasn&apos;t listed any channels yet.</Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {channels.map((c) => (
                  <ChannelCard key={c.id} channel={c} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Audience" />
            <div className="space-y-4 p-5 text-sm">
              <div>
                <div className="text-xs text-slate-500">Primary audience</div>
                <div className="mt-0.5 font-medium text-ink">{a.primary}</div>
              </div>
              <dl className="space-y-2.5">
                {metrics
                  .filter(([, v]) => v !== undefined)
                  .map(([label, v]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="font-semibold text-ink">{formatNumber(v!, true)}</dd>
                    </div>
                  ))}
              </dl>
              <div className="space-y-3 border-t border-slate-100 pt-4">
                {[
                  ["Age ranges", a.ageRanges],
                  ["Customer segments", a.segments],
                  ["Interests", a.interests],
                ].map(([label, items]) =>
                  (items as string[]).length ? (
                    <div key={label as string}>
                      <div className="mb-1.5 text-xs text-slate-500">{label as string}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(items as string[]).map((i) => (
                          <Chip key={i}>{i}</Chip>
                        ))}
                      </div>
                    </div>
                  ) : null,
                )}
                {a.householdIncome && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Household income</span>
                    <span className="text-slate-800">{a.householdIncome}</span>
                  </div>
                )}
                {a.purchaseBehavior && <p className="text-[13px] text-slate-600">{a.purchaseBehavior}</p>}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Looking for" />
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-1.5">
                {brand.lookingFor.map((l) => (
                  <Chip key={l}>{l}</Chip>
                ))}
              </div>
              <div>
                <div className="mb-1.5 text-xs text-slate-500">Partnership models</div>
                <div className="flex flex-wrap gap-1.5">
                  {brand.partnershipModels.map((m) => (
                    <Badge key={m} tone="brand">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
