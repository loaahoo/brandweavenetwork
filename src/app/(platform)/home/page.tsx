import { ArrowRight, CircleDollarSign, Handshake, Link2, MessageSquare, Receipt, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandAvatar } from "@/components/brand/brand-avatar";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, CardHeader, PageHeader, Stat } from "@/components/ui/primitives";
import { TimeChart } from "@/components/ui/time-chart";
import { CURRENT_USER, ACTIVITY } from "@/lib/data/ledger";
import { matchBrands } from "@/lib/matching";
import { analyticsFor, currentBrand, myPartnerships, weekly } from "@/lib/queries";
import { store } from "@/lib/store";
import type { ActivityItem } from "@/lib/types";
import { formatMoney, formatNumber, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

const ACTIVITY_ICON: Record<ActivityItem["kind"], typeof Link2> = {
  message: MessageSquare,
  request: UserPlus,
  proposal: Handshake,
  link: Link2,
  transaction: Receipt,
  payment: CircleDollarSign,
};

export default async function HomePage() {
  const brand = currentBrand();
  const a = await analyticsFor(brand.id);
  const matches = matchBrands(brand, undefined, 3);
  const openOpps = store().opportunities.filter((o) => o.brandId !== brand.id && o.status === "Open").length;
  const inProgress = myPartnerships(brand.id).filter((p) => p.stage !== "Live").length;
  const requests = store().requests.filter((r) => r.toBrandId === brand.id && r.status === "Pending");
  const money = (n: number) => formatMoney(n, "USD", { compact: n >= 10_000_000 });

  return (
    <>
      <PageHeader
        eyebrow={brand.name}
        title={`Welcome back, ${CURRENT_USER.name.split(" ")[0]}`}
        description="Here's how your partnerships are performing over the last 90 days."
        actions={
          <>
            <ButtonLink href="/links" variant="secondary">
              <Link2 className="size-4" /> Create tracking link
            </ButtonLink>
            <ButtonLink href="/discover">Discover brands</ButtonLink>
          </>
        }
      />

      {requests.length > 0 && (
        <Link
          href="/partnerships?tab=requests"
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900 transition-colors hover:bg-brand-100"
        >
          <span className="flex items-center gap-2.5">
            <UserPlus className="size-4 text-brand-600" />
            <strong className="font-semibold">{requests.length} brands</strong> want to partner with you.
          </span>
          <span className="flex items-center gap-1 font-medium">
            Review requests <ArrowRight className="size-4" />
          </span>
        </Link>
      )}

      <section aria-label="Overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Partner Revenue" value={money(a.partnerRevenueCents)} hint="Sales partners drove to you" />
        <Stat label="Revenue Generated for Partners" value={money(a.revenueForPartnersCents)} hint="Sales you drove to partners" />
        <Stat label="Active Partnerships" value={a.activePartnerships} hint={`${inProgress} more in progress`} />
        <Stat label="ROAS" value={a.roas ? `${a.roas.toFixed(1)}×` : "—"} hint="Partner Revenue ÷ partnership cost" />
        <Stat label="Sales" value={formatNumber(a.sales)} hint={`AOV ${money(a.aovCents)}`} />
        <Stat label="Conversions" value={formatNumber(a.conversions)} hint={`${(a.conversionRate * 100).toFixed(1)}% of ${formatNumber(a.clicks)} clicks`} />
        <Stat label="Pending Payouts" value={money(a.pendingPayoutsCents)} hint="Owed to partners" />
        <Stat label="New Opportunities" value={openOpps} hint="Open partner programs" />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader title="Partner-generated revenue" description="Weekly sales attributed to partnerships, both directions" />
          <div className="p-5">
            <TimeChart
              points={weekly(a.series)}
              series={[
                { key: "partnerRevenue", label: "Partner Revenue", color: "var(--color-strand-indigo)" },
                { key: "revenueForPartners", label: "Revenue for partners", color: "var(--color-strand-teal)" },
              ]}
              unit="money"
              ariaLabel="Weekly partner revenue and revenue generated for partners over the last 90 days"
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Recommended brands"
            description="Complementary brands worth a conversation"
            action={
              <Link href="/discover" className="whitespace-nowrap text-[13px] font-medium text-brand-700 hover:underline">
                See all
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100">
            {matches.map((m) => (
              <li key={m.brand.id}>
                <Link href={`/brands/${m.brand.slug}`} className="flex gap-3 px-5 py-4 transition-colors hover:bg-slate-50">
                  <BrandAvatar brand={m.brand} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{m.brand.name}</span>
                      <Badge tone={m.fit === "Strong fit" ? "green" : "brand"}>{m.fit}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[13px] text-slate-500">{m.reasons[0] ?? m.concept}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Partnership activity" description="Messages, requests, proposals, links, transactions and payments" />
        <ul className="divide-y divide-slate-100">
          {[...ACTIVITY].sort((x, y) => y.at.localeCompare(x.at)).map((item) => {
            const Icon = ACTIVITY_ICON[item.kind];
            const body = (
              <>
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{item.title}</span>
                  <span className="block truncate text-[13px] text-slate-500">{item.detail}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">{timeAgo(item.at)}</span>
              </>
            );
            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50">
                    {body}
                  </Link>
                ) : (
                  <div className="flex gap-3 px-5 py-3.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );

}
