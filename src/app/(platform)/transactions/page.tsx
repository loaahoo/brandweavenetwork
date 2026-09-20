import { Receipt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { CURRENT_BRAND_ID, getBrand } from "@/lib/data/brands";
import { transactionsFor } from "@/lib/queries";
import { getPartnership } from "@/lib/store";
import { TRANSACTION_STATUSES, type TransactionStatus } from "@/lib/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Transactions" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const sp = await searchParams;
  const status = TRANSACTION_STATUSES.find((s) => s === sp.status) as TransactionStatus | undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1") || 1);

  const all = await transactionsFor(CURRENT_BRAND_ID);
  const counts = TRANSACTION_STATUSES.map((s) => [s, all.filter((t) => t.status === s).length] as const);
  const rows = all.filter((t) => (!status || t.status === status) && (!q || t.orderId.toLowerCase().includes(q.toLowerCase())));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const view = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status, q: q || undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/transactions${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Transactions" description="Every attributed sale, in both directions, with its commission and where it is in the approval lifecycle." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={qs({ status: undefined, page: undefined })} className={cn("rounded-full border px-3 py-1 text-[13px] font-medium", !status ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}>
          All <span className="opacity-60">{all.length}</span>
        </Link>
        {counts.map(([s, n]) => (
          <Link key={s} href={qs({ status: s, page: undefined })} className={cn("rounded-full border px-3 py-1 text-[13px] font-medium", status === s ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}>
            {s} <span className="opacity-60">{n}</span>
          </Link>
        ))}
        <form action="/transactions" className="ml-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search order ID…" aria-label="Search order ID" className="h-9 w-52 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-card placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15" />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Receipt />} title="No transactions match" description="Sales appear here as soon as a conversion is reported for one of your tracking links." />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Partner</Th>
                <Th>Partnership</Th>
                <Th>Order ID</Th>
                <Th className="text-right">Sale amount</Th>
                <Th className="text-right">Commission</Th>
                <Th>Currency</Th>
                <Th>Status</Th>
                <Th>Channel</Th>
                <Th>Campaign</Th>
              </tr>
            </thead>
            <tbody>
              {view.map((t) => {
                const owe = t.payerId === CURRENT_BRAND_ID;
                const partner = getBrand(owe ? t.promoterId : t.payerId);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <Td>{formatDate(t.date, { month: "short", day: "numeric", year: "numeric" })}</Td>
                    <Td className="font-medium text-ink">{partner?.name}</Td>
                    <Td>
                      <Link href={`/partnerships/${t.partnershipId}?tab=performance`} className="hover:text-brand-700 hover:underline">
                        {getPartnership(t.partnershipId)?.name}
                      </Link>
                    </Td>
                    <Td className="font-mono text-xs">{t.orderId}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(t.saleCents, t.currency)}</Td>
                    <Td className={cn("text-right tabular-nums", t.status === "Reversed" ? "text-slate-400 line-through" : owe ? "text-slate-700" : "font-medium text-emerald-700")}>
                      {owe ? "−" : "+"}
                      {formatMoney(t.commissionCents, t.currency)}
                    </Td>
                    <Td>{t.currency}</Td>
                    <Td>
                      <StatusBadge status={t.status} />
                    </Td>
                    <Td>{t.channelName}</Td>
                    <Td>{t.campaignName}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[13px] text-slate-500">
            <span>
              {rows.length} transactions · <span className="text-emerald-700">+</span> you earn · − you owe
            </span>
            <span className="flex items-center gap-3">
              {page > 1 && (
                <Link href={qs({ page: String(page - 1) })} className="font-medium text-brand-700 hover:underline">
                  Previous
                </Link>
              )}
              <span>
                Page {page} of {pages}
              </span>
              {page < pages && (
                <Link href={qs({ page: String(page + 1) })} className="font-medium text-brand-700 hover:underline">
                  Next
                </Link>
              )}
            </span>
          </div>
        </Card>
      )}
    </>
  );
}
