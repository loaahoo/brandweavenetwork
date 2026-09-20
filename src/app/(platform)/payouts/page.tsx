import { Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, EmptyState, PageHeader, Stat, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { CURRENT_BRAND_ID, getBrand } from "@/lib/data/brands";
import { adjustmentsFor, flatFeesFor, payoutsFor } from "@/lib/queries";
import type { Payout } from "@/lib/types";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Payouts" };
export const dynamic = "force-dynamic";

const total = (p: Payout) => p.commissionCents + p.flatFeeCents + p.adjustmentCents;

export default async function PayoutsPage() {
  const all = await payoutsFor(CURRENT_BRAND_ID);
  const owe = all.filter((p) => p.payerId === CURRENT_BRAND_ID);
  const owed = all.filter((p) => p.promoterId === CURRENT_BRAND_ID);
  const open = (rows: Payout[]) => rows.filter((p) => p.status !== "Paid");
  const sum = (rows: Payout[]) => rows.reduce((n, p) => n + total(p), 0);
  const [flatFees, adjustments] = await Promise.all([flatFeesFor(CURRENT_BRAND_ID), adjustmentsFor(CURRENT_BRAND_ID)]);

  return (
    <>
      <PageHeader title="Payouts" description="What you owe partners and what partners owe you, including flat fees and adjustments." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="You owe" value={formatMoney(sum(open(owe)), "USD", { compact: true })} hint={`${open(owe).length} open payouts`} />
        <Stat label="Owed to you" value={formatMoney(sum(open(owed)), "USD", { compact: true })} hint={`${open(owed).length} open payouts`} />
        <Stat label="Paid out" value={formatMoney(sum(owe.filter((p) => p.status === "Paid")), "USD", { compact: true })} hint="All time, to partners" />
        <Stat label="Received" value={formatMoney(sum(owed.filter((p) => p.status === "Paid")), "USD", { compact: true })} hint="All time, from partners" />
      </div>

      {all.length === 0 ? (
        <EmptyState icon={<Wallet />} title="No payouts yet" description="Payouts are calculated from payable transactions, flat fees and adjustments once a partnership is live." />
      ) : (
        <Card>
          <CardHeader title="Payment ledger" description="Statements per partnership and period. Automated payouts arrive with a payment provider." />
          <Table>
            <thead>
              <tr>
                <Th>Period</Th>
                <Th>Partnership</Th>
                <Th>Direction</Th>
                <Th className="text-right">Commission</Th>
                <Th className="text-right">Flat fees</Th>
                <Th className="text-right">Adjustments</Th>
                <Th className="text-right">Total</Th>
                <Th>Due</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {all.map((p) => {
                const youPay = p.payerId === CURRENT_BRAND_ID;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <Td className="font-medium text-ink">{p.period}</Td>
                    <Td>
                      <Link href={`/partnerships/${p.partnershipId}`} className="hover:text-brand-700 hover:underline">
                        {getBrand(youPay ? p.promoterId : p.payerId)?.name}
                      </Link>
                      <div className="text-xs text-slate-400">{p.transactionCount} transactions</div>
                    </Td>
                    <Td>{youPay ? "You pay" : "You receive"}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(p.commissionCents)}</Td>
                    <Td className="text-right tabular-nums">{p.flatFeeCents ? formatMoney(p.flatFeeCents) : "—"}</Td>
                    <Td className={cn("text-right tabular-nums", p.adjustmentCents < 0 && "text-red-600")}>{p.adjustmentCents ? formatMoney(p.adjustmentCents) : "—"}</Td>
                    <Td className={cn("text-right font-semibold tabular-nums", youPay ? "text-ink" : "text-emerald-700")}>{formatMoney(total(p))}</Td>
                    <Td>{formatDate(p.dueDate, { month: "short", day: "numeric", year: "numeric" })}</Td>
                    <Td>
                      <StatusBadge status={p.status} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Flat fees" description="Sponsorships, placements and activations" />
          {flatFees.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">No flat fees.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {flatFees.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div>
                    <div className="text-sm font-medium text-ink">{f.label}</div>
                    <div className="text-xs text-slate-500">
                      {f.payerId === CURRENT_BRAND_ID ? `You pay ${getBrand(f.promoterId)?.name}` : `${getBrand(f.payerId)?.name} pays you`} · due {formatDate(f.dueDate, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-ink">{formatMoney(f.amountCents)}</span>
                    <StatusBadge status={f.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Adjustments" description="Clawbacks for returns on already-paid commission" />
          {adjustments.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">No adjustments.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {adjustments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{a.label}</div>
                    <div className="text-xs text-slate-500">{formatDate(a.createdAt, { month: "short", day: "numeric" })}</div>
                  </div>
                  <span className={cn("text-sm font-semibold tabular-nums", a.amountCents < 0 ? "text-red-600" : "text-ink")}>{formatMoney(a.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
