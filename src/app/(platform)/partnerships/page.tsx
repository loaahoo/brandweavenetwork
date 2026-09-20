import { ArrowLeftRight, Handshake, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandAvatar, PairAvatar } from "@/components/brand/brand-avatar";
import { RequestActions } from "@/components/platform/request-actions";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, Chip, EmptyState, PageHeader, StageStepper, StatusBadge } from "@/components/ui/primitives";
import { describeCompensation } from "@/lib/commission";
import { CURRENT_BRAND_ID } from "@/lib/data/brands";
import { getDirectory } from "@/lib/db/directory";
import { listRequests } from "@/lib/db/network";
import { myPartnerships, partnerOf } from "@/lib/queries";
import { formatDate, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Partnerships" };
export const dynamic = "force-dynamic";

export default async function PartnershipsPage({ searchParams }: PageProps<"/partnerships">) {
  const sp = await searchParams;
  const tab = sp.tab === "requests" ? "requests" : "partnerships";
  const [dir, partnerships, { incoming, outgoing }] = await Promise.all([getDirectory(), myPartnerships(), listRequests(CURRENT_BRAND_ID)]);
  const pendingIn = incoming.filter((r) => r.status === "Pending" || r.status === "Question").length;

  return (
    <>
      <PageHeader
        title="Partnerships"
        description="Every partnership has a private Deal Room: discussion, proposal, terms, integration and go-live."
        actions={<ButtonLink href="/discover">Find a partner</ButtonLink>}
      />

      <div role="tablist" className="mb-6 inline-flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
        <Link role="tab" aria-selected={tab === "partnerships"} href="/partnerships" className={`rounded-md px-3.5 py-1.5 ${tab === "partnerships" ? "bg-white text-ink shadow-card" : "text-slate-500 hover:text-slate-800"}`}>
          Deal Rooms <span className="ml-1 text-slate-400">{partnerships.length}</span>
        </Link>
        <Link role="tab" aria-selected={tab === "requests"} href="/partnerships?tab=requests" className={`rounded-md px-3.5 py-1.5 ${tab === "requests" ? "bg-white text-ink shadow-card" : "text-slate-500 hover:text-slate-800"}`}>
          Requests {pendingIn > 0 && <span className="ml-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">{pendingIn}</span>}
        </Link>
      </div>

      {tab === "partnerships" ? (
        partnerships.length === 0 ? (
          <EmptyState icon={<Handshake />} title="No partnerships yet" description="Find a complementary brand in Discover and send a connection request. Accepted requests open a Deal Room." action={<ButtonLink href="/discover">Discover brands</ButtonLink>} />
        ) : (
          <div className="space-y-4">
            {partnerships.map((p) => {
              const partner = partnerOf(p, dir);
              const me = dir.brand(CURRENT_BRAND_ID)!;
              return (
                <Link key={p.id} href={`/partnerships/${p.id}`} className="block">
                  <Card className="p-5 transition-shadow hover:shadow-raised">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <PairAvatar a={me} b={partner} size="md" />
                        <div>
                          <h2 className="text-base font-semibold tracking-tight text-ink">{p.name}</h2>
                          <p className="text-[13px] text-slate-500">
                            Owner {p.owner} · updated {timeAgo(p.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <StageStepper stage={p.stage} className="hidden md:flex" />
                      <Badge tone={p.stage === "Live" ? "green" : "brand"} className="md:hidden">
                        {p.stage}
                      </Badge>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">{p.summary}</p>

                    {p.directions.length > 0 && (
                      <ul className="mt-4 grid gap-2 md:grid-cols-2">
                        {p.directions.map((d) => (
                          <li key={d.id} className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px]">
                            <ArrowLeftRight className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                            <span>
                              <span className="font-medium text-slate-800">
                                {dir.brand(d.promoterId)!.name} → {dir.brand(d.payerId)!.name}
                              </span>
                              <span className="block text-slate-500">{describeCompensation(d.compensation)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {p.nextStep && (
                      <p className="mt-3 text-[13px] text-slate-500">
                        <span className="font-medium text-slate-700">Next:</span> {p.nextStep}
                      </p>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="in-h">
            <h2 id="in-h" className="mb-3 text-lg font-semibold tracking-tight text-ink">
              Requests to you
            </h2>
            {incoming.length === 0 ? (
              <EmptyState icon={<Inbox />} title="No requests yet" description="When another brand asks to partner with you, it will show up here." />
            ) : (
              <div className="space-y-3">
                {incoming.map((r) => {
                  const from = dir.brand(r.fromBrandId)!;
                  return (
                    <Card key={r.id} className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 gap-3.5">
                          <BrandAvatar brand={from} size="md" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={`/brands/${from.slug}`} className="font-semibold text-ink hover:text-brand-700">
                                {from.name}
                              </Link>
                              <StatusBadge status={r.status} />
                              <span className="text-xs text-slate-400">{formatDate(r.createdAt, { month: "short", day: "numeric" })}</span>
                            </div>
                            <p className="mt-1.5 text-sm text-slate-700">{r.intro}</p>
                            <p className="mt-1 text-sm text-slate-600">{r.idea}</p>
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              <Badge tone="brand">{r.structure}</Badge>
                              {r.channelsOfInterest.map((id) => (
                                <Chip key={id}>{dir.channel(id)?.name}</Chip>
                              ))}
                            </div>
                          </div>
                        </div>
                        <RequestActions requestId={r.id} status={r.status} />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="out-h">
            <h2 id="out-h" className="mb-3 text-lg font-semibold tracking-tight text-ink">
              Requests you sent
            </h2>
            {outgoing.length === 0 ? (
              <p className="text-sm text-slate-500">You haven&apos;t sent any requests. Browse Discover to get started.</p>
            ) : (
              <Card>
                <ul className="divide-y divide-slate-100">
                  {outgoing.map((r) => {
                    const to = dir.brand(r.toBrandId)!;
                    return (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <BrandAvatar brand={to} size="sm" />
                          <div>
                            <Link href={`/brands/${to.slug}`} className="text-sm font-semibold text-ink hover:text-brand-700">
                              {to.name}
                            </Link>
                            <p className="line-clamp-1 max-w-xl text-[13px] text-slate-500">{r.idea}</p>
                          </div>
                        </div>
                        <StatusBadge status={r.status} />
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}
          </section>
        </div>
      )}
    </>
  );
}
