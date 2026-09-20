import { ArrowLeft, ArrowRight, FileText, StickyNote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PairAvatar } from "@/components/brand/brand-avatar";
import { ChannelCard } from "@/components/platform/cards";
import { DealBuilder } from "@/components/platform/deal-builder";
import { MessageComposer } from "@/components/platform/message-composer";
import { Badge, Card, CardHeader, Chip, EmptyState, StageStepper, Stat, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { TimeChart } from "@/components/ui/time-chart";
import { describeCompensation, paymentNetDays } from "@/lib/commission";
import { can } from "@/lib/constants";
import { CURRENT_BRAND_ID, getBrand } from "@/lib/data/brands";
import { CHANNELS, getChannel } from "@/lib/data/channels";
import { CURRENT_USER } from "@/lib/data/ledger";
import { assetsFor, currentBrand, partnerOf, weekly, type DayPoint } from "@/lib/queries";
import { getPartnership, store } from "@/lib/store";
import { trackingUrl } from "@/lib/tracking";
import type { Brand, DealDirection } from "@/lib/types";
import { addDays, DEMO_NOW, formatDate, formatMoney, formatNumber, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS = [
  ["overview", "Overview"],
  ["messages", "Messages"],
  ["terms", "Deal terms"],
  ["channels", "Channels"],
  ["links", "Links & assets"],
  ["performance", "Performance"],
  ["files", "Files & notes"],
] as const;
type Tab = (typeof TABS)[number][0];

export async function generateMetadata({ params }: PageProps<"/partnerships/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getPartnership(id)?.name ?? "Deal Room" };
}

export default async function DealRoomPage({ params, searchParams }: PageProps<"/partnerships/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const p = getPartnership(id);
  if (!p || (p.brandAId !== CURRENT_BRAND_ID && p.brandBId !== CURRENT_BRAND_ID)) notFound();

  const tab: Tab = TABS.some(([t]) => t === sp.tab) ? (sp.tab as Tab) : "overview";
  const me = currentBrand();
  const partner = partnerOf(p);
  const s = store();
  const messages = s.messages
    .filter((m) => m.partnershipId === p.id)
    // Internal notes are visible only to the brand that wrote them.
    .filter((m) => m.kind !== "note" || m.authorBrandId === CURRENT_BRAND_ID)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <>
      <Link href="/partnerships" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" /> Partnerships
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-center gap-4">
          <PairAvatar a={me} b={partner} size="lg" />
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-brand-600">Deal Room</div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{p.name}</h1>
          </div>
        </div>
        <StageStepper stage={p.stage} className="flex-wrap" />
      </div>

      <nav role="tablist" aria-label="Deal Room sections" className="scrollbar-thin mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map(([t, label]) => (
          <Link
            key={t}
            role="tab"
            aria-selected={tab === t}
            href={t === "overview" ? `/partnerships/${p.id}` : `/partnerships/${p.id}?tab=${t}`}
            className={`-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {label}
            {t === "messages" && <span className="ml-1.5 text-xs text-slate-400">{messages.filter((m) => m.kind !== "note").length}</span>}
          </Link>
        ))}
      </nav>

      {tab === "overview" && <Overview p={p} me={me} partner={partner} />}

      {tab === "messages" && (
        <div className="mx-auto max-w-3xl">
          {messages.length === 0 ? (
            <EmptyState icon={<FileText />} title="Start the conversation" description="Introduce your team, share context, and outline what you'd like to build together." />
          ) : (
            <ol className="mb-6 space-y-4">
              {messages.map((m) => {
                if (m.kind === "system")
                  return (
                    <li key={m.id} className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="h-px flex-1 bg-slate-200" />
                      <span>
                        {m.body} · {timeAgo(m.createdAt)}
                      </span>
                      <span className="h-px flex-1 bg-slate-200" />
                    </li>
                  );
                const brand = getBrand(m.authorBrandId)!;
                const mine = m.authorBrandId === CURRENT_BRAND_ID;
                return (
                  <li key={m.id} className="flex gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: brand.color }}>
                      {m.authorName[0]}
                    </span>
                    <div className={`min-w-0 flex-1 rounded-xl px-4 py-3 ${m.kind === "note" ? "border border-amber-200 bg-amber-50" : mine ? "bg-brand-50" : "border border-slate-200 bg-white"}`}>
                      <div className="mb-1 flex flex-wrap items-baseline gap-x-2 text-[13px]">
                        <span className="font-semibold text-ink">{m.authorName}</span>
                        <span className="text-slate-500">{brand.name}</span>
                        {m.kind === "note" && <Badge tone="amber">Internal note</Badge>}
                        <span className="text-xs text-slate-400">{formatDate(m.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{m.body}</p>
                      {m.attachments?.map((f) => (
                        <div key={f.name} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700">
                          <FileText className="size-4 text-slate-400" /> {f.name} <span className="text-slate-400">{f.size}</span>
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <MessageComposer partnershipId={p.id} disabled={!can(CURRENT_USER.role, "messages.send")} />
        </div>
      )}

      {tab === "terms" && (
        <DealBuilder
          partnership={p}
          brands={[me, partner]}
          channels={{ [me.id]: CHANNELS.filter((c) => c.brandId === me.id), [partner.id]: CHANNELS.filter((c) => c.brandId === partner.id) }}
          canNegotiate={can(CURRENT_USER.role, "deal.negotiate")}
          canAccept={can(CURRENT_USER.role, "deal.accept")}
        />
      )}

      {tab === "channels" && <ChannelsTab directions={p.directions} />}
      {tab === "links" && <LinksTab partnershipId={p.id} partner={partner} />}
      {tab === "performance" && <PerformanceTab partnershipId={p.id} />}

      {tab === "files" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Files" description="Shared in this Deal Room" />
            <ul className="divide-y divide-slate-100">
              {messages.flatMap((m) => (m.attachments ?? []).map((f) => ({ f, m }))).map(({ f, m }) => (
                <li key={f.name} className="flex items-center gap-3 px-5 py-3.5">
                  <FileText className="size-5 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">{f.name}</div>
                    <div className="text-xs text-slate-500">
                      {f.size} · {m.authorName} · {formatDate(m.createdAt, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </li>
              ))}
              {messages.every((m) => !m.attachments?.length) && <li className="px-5 py-8 text-center text-sm text-slate-500">No files shared yet.</li>}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Internal notes" description="Only your team can see these" />
            <ul className="divide-y divide-slate-100">
              {messages.filter((m) => m.kind === "note").map((m) => (
                <li key={m.id} className="flex gap-3 px-5 py-3.5">
                  <StickyNote className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm text-slate-700">{m.body}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {m.authorName} · {timeAgo(m.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
              {!messages.some((m) => m.kind === "note") && <li className="px-5 py-8 text-center text-sm text-slate-500">No notes yet. Add one from the Messages tab.</li>}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function DirectionSummary({ d }: { d: DealDirection }) {
  const from = getBrand(d.promoterId)!;
  const to = getBrand(d.payerId)!;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        {from.name} <ArrowRight className="size-4 text-slate-400" /> {to.name}
      </div>
      <p className="mt-0.5 text-[13px] text-slate-500">
        {from.name} promotes {to.name}; {to.name} pays {from.name}.
      </p>
      <div className="mt-3 text-lg font-semibold tracking-tight text-ink">{describeCompensation(d.compensation)}</div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
        <div>
          <dt className="text-slate-500">Attribution</dt>
          <dd className="text-slate-800">
            {d.attribution.windowDays}-day {d.attribution.method.replace("_", " ")}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Payment terms</dt>
          <dd className="text-slate-800">Net {paymentNetDays(d.paymentTerms, d.customPaymentDays)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Returns / locking</dt>
          <dd className="text-slate-800">
            {d.rules.returnsPeriodDays}d / {d.rules.lockingPeriodDays}d
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Customers</dt>
          <dd className="text-slate-800">{d.rules.customers === "new_only" ? "New only" : "All"}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {d.channelIds.map((c) => (
          <Chip key={c}>{getChannel(c)?.name}</Chip>
        ))}
      </div>
    </Card>
  );
}

function Overview({ p, me, partner }: { p: NonNullable<ReturnType<typeof getPartnership>>; me: Brand; partner: Brand }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold text-ink">Partnership overview</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{p.summary}</p>
          {p.nextStep && (
            <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900">
              <span className="font-semibold">Next step:</span> {p.nextStep}
            </div>
          )}
        </Card>

        <div>
          <h2 className="mb-3 text-lg font-semibold tracking-tight text-ink">Commercial structure</h2>
          {p.directions.length === 0 ? (
            <EmptyState
              icon={<FileText />}
              title="No terms yet"
              description="When you're ready, use the Deal Builder to propose channels, compensation, attribution and payment terms."
              action={
                <Link href={`/partnerships/${p.id}?tab=terms`} className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">
                  Open Deal Builder
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {p.directions.map((d) => (
                <DirectionSummary key={d.id} d={d} />
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-6">
        <Card>
          <CardHeader title="Details" />
          <dl className="space-y-3 p-5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Proposal</dt>
              <dd>
                <StatusBadge status={p.proposalStatus === "None" ? "Draft" : p.proposalStatus} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Stage</dt>
              <dd className="font-medium text-ink">{p.stage}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Owner</dt>
              <dd className="text-slate-800">{p.owner}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-800">{formatDate(p.createdAt)}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Participating brands" />
          <ul className="divide-y divide-slate-100">
            {[me, partner].map((b) => (
              <li key={b.id}>
                <Link href={`/brands/${b.slug}`} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm hover:bg-slate-50">
                  <span className="font-medium text-ink">{b.name}</span>
                  <span className="text-xs text-slate-500">{b.industry}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  );
}

function ChannelsTab({ directions }: { directions: DealDirection[] }) {
  if (directions.length === 0) return <EmptyState icon={<FileText />} title="No channels selected" description="Channels are chosen in the Deal Builder as part of the proposal." />;
  return (
    <div className="space-y-8">
      {directions.map((d) => (
        <section key={d.id}>
          <h2 className="mb-3 text-[15px] font-semibold text-ink">
            {getBrand(d.promoterId)!.name} contributes
          </h2>
          {d.channelIds.length === 0 ? (
            <p className="text-sm text-slate-500">No channels selected yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {d.channelIds.map((id) => {
                const c = getChannel(id);
                return c ? <ChannelCard key={id} channel={c} /> : null;
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function LinksTab({ partnershipId, partner }: { partnershipId: string; partner: Brand }) {
  const links = store().links.filter((l) => l.partnershipId === partnershipId);
  const assets = assetsFor(partner.id).filter((a) => a.approved);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Tracking links" action={<Link href="/links" className="text-[13px] font-medium text-brand-700 hover:underline">Manage links</Link>} />
        {links.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">No tracking links for this partnership yet.</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Link</Th>
                <Th>Campaign</Th>
                <Th>Placement</Th>
                <Th className="text-right">Clicks</Th>
                <Th className="text-right">Conversions</Th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id}>
                  <Td className="font-mono text-xs text-slate-800">{trackingUrl(l.code, "brandweavenetwork.com").replace("https://", "")}</Td>
                  <Td>{l.campaignName}</Td>
                  <Td>{l.placement}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(l.clicks)}</Td>
                  <Td className="text-right tabular-nums">{formatNumber(l.conversions)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card>
        <CardHeader title={`Approved assets from ${partner.name}`} description="Creative you're cleared to use in this partnership" />
        {assets.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">{partner.name} hasn&apos;t shared approved assets yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {assets.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <div className="text-sm font-medium text-ink">{a.name}</div>
                  <div className="text-xs text-slate-500">{a.detail}</div>
                </div>
                <Badge>{a.kind}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function PerformanceTab({ partnershipId }: { partnershipId: string }) {
  const txns = store().transactions.filter((t) => t.partnershipId === partnershipId && t.status !== "Reversed");
  if (txns.length === 0) return <EmptyState icon={<FileText />} title="No performance yet" description="Sales will appear here once tracking links are live and the first conversion is reported." />;
  const to = (t: (typeof txns)[number]) => t.payerId === CURRENT_BRAND_ID;
  const sum = (rows: typeof txns, f: (t: (typeof txns)[number]) => number) => rows.reduce((n, t) => n + f(t), 0);
  const inbound = txns.filter(to);
  const outbound = txns.filter((t) => !to(t));

  const buckets = new Map<string, DayPoint>();
  for (let i = 90; i >= 0; i--) {
    const d = addDays(DEMO_NOW, -i).slice(0, 10);
    buckets.set(d, { date: d, partnerRevenue: 0, revenueForPartners: 0, conversions: 0 });
  }
  for (const t of txns) {
    const b = buckets.get(t.date.slice(0, 10));
    if (!b) continue;
    if (to(t)) b.partnerRevenue += t.saleCents;
    else b.revenueForPartners += t.saleCents;
    b.conversions++;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Partner Revenue" value={formatMoney(sum(inbound, (t) => t.saleCents), "USD", { compact: true })} hint={`${inbound.length} sales`} />
        <Stat label="Revenue for partner" value={formatMoney(sum(outbound, (t) => t.saleCents), "USD", { compact: true })} hint={`${outbound.length} sales`} />
        <Stat label="Commission owed" value={formatMoney(sum(inbound.filter((t) => t.status !== "Paid"), (t) => t.commissionCents))} hint="Unpaid, you owe" />
        <Stat label="Commission earned" value={formatMoney(sum(outbound, (t) => t.commissionCents))} hint="Partner owes you" />
      </div>
      <Card>
        <CardHeader title="Weekly revenue" />
        <div className="p-5">
          <TimeChart
            points={weekly([...buckets.values()])}
            series={[
              { key: "partnerRevenue", label: "Partner Revenue", color: "var(--color-strand-indigo)" },
              { key: "revenueForPartners", label: "Revenue for partner", color: "var(--color-strand-teal)" },
            ]}
            unit="money"
            ariaLabel="Weekly revenue in each direction for this partnership"
          />
        </div>
      </Card>
    </div>
  );
}
