"use client";

import { ArrowRight } from "lucide-react";
import { useState, useTransition } from "react";
import { submitProposal, type ActionResult, type ProposalInput } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { computeSaleCommission, describeCompensation, paymentNetDays } from "@/lib/commission";
import { COMPENSATION_MODELS } from "@/lib/constants";
import type { AttributionMethod, Brand, Channel, CompensationModel, CustomerRule, DealDirection, PaymentTerms, Partnership } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";

interface DirState {
  enabled: boolean;
  channelIds: string[];
  model: CompensationModel;
  pct: string;
  cpa: string;
  cpl: string;
  cpc: string;
  flat: string;
  flatLabel: string;
  notes: string;
  windowDays: string;
  method: AttributionMethod;
  click: boolean;
  promo: boolean;
  eligible: string;
  excluded: string;
  customers: CustomerRule;
  geo: string;
  returnsDays: string;
  lockDays: string;
  terms: PaymentTerms;
  customDays: string;
}

const dollars = (c?: number) => (c === undefined ? "" : String(c / 100));
const toCents = (s: string) => Math.max(0, Math.round((parseFloat(s) || 0) * 100));
const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function fromDirection(d: DealDirection | undefined): DirState {
  return {
    enabled: !!d,
    channelIds: d?.channelIds ?? [],
    model: d?.compensation.model ?? "Commission",
    pct: d?.compensation.commissionBps !== undefined ? String(d.compensation.commissionBps / 100) : "10",
    cpa: dollars(d?.compensation.cpaCents),
    cpl: dollars(d?.compensation.cplCents),
    cpc: dollars(d?.compensation.cpcCents),
    flat: dollars(d?.compensation.flatFeeCents),
    flatLabel: d?.compensation.flatFeeLabel ?? "flat fee",
    notes: d?.compensation.notes ?? "",
    windowDays: String(d?.attribution.windowDays ?? 30),
    method: d?.attribution.method ?? "last_click",
    click: d?.attribution.clickAttribution ?? true,
    promo: d?.attribution.promoCodeAttribution ?? false,
    eligible: d?.rules.eligibleProducts.join(", ") ?? "",
    excluded: d?.rules.excludedSkus.join(", ") ?? "GIFTCARD",
    customers: d?.rules.customers ?? "all",
    geo: d?.rules.geoRestrictions.join(", ") ?? "",
    returnsDays: String(d?.rules.returnsPeriodDays ?? 30),
    lockDays: String(d?.rules.lockingPeriodDays ?? 15),
    terms: d?.paymentTerms ?? "net30",
    customDays: String(d?.customPaymentDays ?? 30),
  };
}

function toComp(s: DirState): ProposalInput["directions"][number]["compensation"] {
  const usesPct = s.model === "Commission" || s.model === "Revenue share" || s.model === "Hybrid" || s.model === "Custom";
  return {
    model: s.model,
    commissionBps: usesPct ? Math.min(10_000, Math.round((parseFloat(s.pct) || 0) * 100)) : undefined,
    cpaCents: s.model === "CPA" ? toCents(s.cpa) : undefined,
    cplCents: s.model === "CPL" ? toCents(s.cpl) : undefined,
    cpcCents: s.model === "CPC" ? toCents(s.cpc) : undefined,
    flatFeeCents: s.model === "Flat fee" || s.model === "Hybrid" ? toCents(s.flat) : undefined,
    flatFeeLabel: s.model === "Flat fee" || s.model === "Hybrid" ? s.flatLabel || "flat fee" : undefined,
    notes: s.model === "Custom" ? s.notes : undefined,
  };
}

const EXAMPLE_SALES_CENTS = 10_000_000; // $100,000 of attributed sales
const EXAMPLE_ORDERS = 400;

export function DealBuilder({
  partnership,
  brands,
  channels,
  canNegotiate,
  canAccept,
}: {
  partnership: Partnership;
  brands: [Brand, Brand];
  channels: Record<string, Channel[]>;
  canNegotiate: boolean;
  canAccept: boolean;
}) {
  const [a, b] = brands;
  const [state, setState] = useState<Record<string, DirState>>(() => ({
    [a.id]: fromDirection(partnership.directions.find((d) => d.promoterId === a.id)),
    [b.id]: fromDirection(partnership.directions.find((d) => d.promoterId === b.id)),
  }));
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const patch = (id: string, p: Partial<DirState>) => setState((s) => ({ ...s, [id]: { ...s[id]!, ...p } }));

  function submit(action: ProposalInput["action"]) {
    const directions = [a, b]
      .filter((br) => state[br.id]!.enabled)
      .map((br) => {
        const s = state[br.id]!;
        return {
          promoterId: br.id,
          channelIds: s.channelIds,
          compensation: toComp(s),
          attribution: { windowDays: parseInt(s.windowDays) || 0, method: s.method, clickAttribution: s.click, promoCodeAttribution: s.promo },
          rules: {
            eligibleProducts: csv(s.eligible),
            excludedSkus: csv(s.excluded),
            customers: s.customers,
            geoRestrictions: csv(s.geo).map((g) => g.toUpperCase()),
            returnsPeriodDays: Math.max(0, parseInt(s.returnsDays) || 0),
            lockingPeriodDays: Math.max(0, parseInt(s.lockDays) || 0),
          },
          paymentTerms: s.terms,
          customPaymentDays: s.terms === "custom" ? parseInt(s.customDays) || 30 : undefined,
        };
      });
    start(async () => setResult(await submitProposal({ partnershipId: partnership.id, directions, action })));
  }

  const anyEnabled = state[a.id]!.enabled || state[b.id]!.enabled;
  const negotiating = partnership.proposalStatus === "Sent" || partnership.proposalStatus === "Countered";

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Partnerships work both ways. Turn on one direction, or both: each has its own channels, compensation, attribution and payment terms.
      </p>

      {[a, b].map((brand) => {
        const other = brand.id === a.id ? b : a;
        const s = state[brand.id]!;
        const list = channels[brand.id] ?? [];
        const comp = toComp(s);
        const perOrder = computeSaleCommission(comp, EXAMPLE_SALES_CENTS / EXAMPLE_ORDERS);
        const commission = comp.model === "CPA" ? perOrder * EXAMPLE_ORDERS : comp.model === "CPL" || comp.model === "CPC" ? 0 : computeSaleCommission(comp, EXAMPLE_SALES_CENTS);
        const flat = comp.flatFeeCents ?? 0;

        return (
          <Card key={brand.id} className={cn(!s.enabled && "opacity-80")}>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  {brand.name} <ArrowRight className="size-4 text-slate-400" /> {other.name}
                </span>
              }
              description={`${brand.name} promotes ${other.name}. ${other.name} pays ${brand.name}.`}
              action={
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" className="size-4 accent-brand-600" checked={s.enabled} disabled={!canNegotiate} onChange={(e) => patch(brand.id, { enabled: e.target.checked })} />
                  Include
                </label>
              }
            />

            {s.enabled && (
              <fieldset disabled={!canNegotiate} className="grid gap-6 p-5 lg:grid-cols-2">
                {/* Channels */}
                <div className="lg:col-span-2">
                  <div className="mb-2 text-[13px] font-medium text-slate-700">Channels {brand.name} contributes</div>
                  {list.length === 0 ? (
                    <p className="text-sm text-slate-500">{brand.name} hasn&apos;t listed any Available Channels.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {list.map((c) => (
                        <label key={c.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-3 text-sm has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/60">
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 accent-brand-600"
                            checked={s.channelIds.includes(c.id)}
                            onChange={(e) => patch(brand.id, { channelIds: e.target.checked ? [...s.channelIds, c.id] : s.channelIds.filter((x) => x !== c.id) })}
                          />
                          <span>
                            <span className="block font-medium text-slate-800">{c.name}</span>
                            <span className="block text-xs text-slate-500">{c.reachLabel}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Compensation */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-ink">Compensation</h4>
                  <Field label="Model">
                    <Select value={s.model} onChange={(e) => patch(brand.id, { model: e.target.value as CompensationModel })}>
                      {COMPENSATION_MODELS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </Select>
                  </Field>
                  {(s.model === "Commission" || s.model === "Revenue share" || s.model === "Hybrid" || s.model === "Custom") && (
                    <Field label="Percentage of approved revenue">
                      <div className="relative">
                        <Input type="number" min={0} max={100} step={0.5} value={s.pct} onChange={(e) => patch(brand.id, { pct: e.target.value })} className="pr-8" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                      </div>
                    </Field>
                  )}
                  {s.model === "CPA" && <MoneyField label="Fixed amount per approved sale" value={s.cpa} onChange={(v) => patch(brand.id, { cpa: v })} />}
                  {s.model === "CPL" && <MoneyField label="Amount per qualified lead" value={s.cpl} onChange={(v) => patch(brand.id, { cpl: v })} />}
                  {s.model === "CPC" && <MoneyField label="Amount per click" value={s.cpc} onChange={(v) => patch(brand.id, { cpc: v })} step="0.01" />}
                  {(s.model === "Flat fee" || s.model === "Hybrid") && (
                    <div className="grid grid-cols-2 gap-3">
                      <MoneyField label="Flat fee" value={s.flat} onChange={(v) => patch(brand.id, { flat: v })} />
                      <Field label="Fee label">
                        <Input value={s.flatLabel} onChange={(e) => patch(brand.id, { flatLabel: e.target.value })} maxLength={40} placeholder="launch fee" />
                      </Field>
                    </div>
                  )}
                  {s.model === "Custom" && (
                    <Field label="Custom terms">
                      <Textarea value={s.notes} onChange={(e) => patch(brand.id, { notes: e.target.value })} maxLength={500} className="min-h-16" />
                    </Field>
                  )}
                  <div className="rounded-lg bg-slate-50 p-3 text-[13px]">
                    <div className="font-medium text-slate-800">{describeCompensation(comp)}</div>
                    {(commission > 0 || flat > 0) && (
                      <div className="mt-1.5 flex flex-wrap gap-x-4 text-slate-500">
                        <span>
                          On {formatMoney(EXAMPLE_SALES_CENTS, "USD", { compact: true })} of sales ({EXAMPLE_ORDERS} orders):
                        </span>
                        {flat > 0 && <span>fee {formatMoney(flat)}</span>}
                        {commission > 0 && <span>commission {formatMoney(commission)}</span>}
                        <span className="font-semibold text-ink">total {formatMoney(flat + commission)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attribution + rules */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-ink">Attribution</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Window (days)">
                      <Input type="number" min={1} max={365} value={s.windowDays} onChange={(e) => patch(brand.id, { windowDays: e.target.value })} />
                    </Field>
                    <Field label="Method">
                      <Select value={s.method} onChange={(e) => patch(brand.id, { method: e.target.value as AttributionMethod })}>
                        <option value="last_click">Last click</option>
                        <option value="first_click">First click</option>
                        <option value="custom">Custom</option>
                      </Select>
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="size-4 accent-brand-600" checked={s.click} onChange={(e) => patch(brand.id, { click: e.target.checked })} /> Click attribution
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="size-4 accent-brand-600" checked={s.promo} onChange={(e) => patch(brand.id, { promo: e.target.checked })} /> Promo code attribution
                    </label>
                  </div>

                  <h4 className="pt-2 text-sm font-semibold text-ink">Transaction rules</h4>
                  <Field label="Eligible products (SKUs)" hint="Comma-separated. Leave empty for all products.">
                    <Input value={s.eligible} onChange={(e) => patch(brand.id, { eligible: e.target.value })} />
                  </Field>
                  <Field label="Excluded SKUs">
                    <Input value={s.excluded} onChange={(e) => patch(brand.id, { excluded: e.target.value })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Customers">
                      <Select value={s.customers} onChange={(e) => patch(brand.id, { customers: e.target.value as CustomerRule })}>
                        <option value="all">All customers</option>
                        <option value="new_only">New customers only</option>
                        <option value="existing_ok">Existing customers allowed</option>
                      </Select>
                    </Field>
                    <Field label="Geographies" hint="ISO codes, e.g. US, CA">
                      <Input value={s.geo} onChange={(e) => patch(brand.id, { geo: e.target.value })} placeholder="Anywhere" />
                    </Field>
                    <Field label="Returns period (days)">
                      <Input type="number" min={0} value={s.returnsDays} onChange={(e) => patch(brand.id, { returnsDays: e.target.value })} />
                    </Field>
                    <Field label="Locking period (days)">
                      <Input type="number" min={0} value={s.lockDays} onChange={(e) => patch(brand.id, { lockDays: e.target.value })} />
                    </Field>
                  </div>

                  <h4 className="pt-2 text-sm font-semibold text-ink">Payment terms</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Terms">
                      <Select value={s.terms} onChange={(e) => patch(brand.id, { terms: e.target.value as PaymentTerms })}>
                        <option value="net15">Net 15</option>
                        <option value="net30">Net 30</option>
                        <option value="net45">Net 45</option>
                        <option value="custom">Custom</option>
                      </Select>
                    </Field>
                    {s.terms === "custom" && (
                      <Field label="Days">
                        <Input type="number" min={1} max={180} value={s.customDays} onChange={(e) => patch(brand.id, { customDays: e.target.value })} />
                      </Field>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Pending until returns close ({s.returnsDays || 0}d) → locked {s.lockDays || 0}d later → payable next billing cycle → due {paymentNetDays(s.terms, parseInt(s.customDays) || 30)} days after.
                  </p>
                </div>
              </fieldset>
            )}
          </Card>
        );
      })}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-raised backdrop-blur">
        <div className="text-sm">
          {result ? (
            <span role={result.ok ? "status" : "alert"} className={result.ok ? "font-medium text-emerald-700" : "font-medium text-red-600"}>
              {result.ok ? result.message : result.error}
            </span>
          ) : (
            <span className="text-slate-500">
              Status: <strong className="font-semibold text-slate-800">{partnership.proposalStatus === "None" ? "No proposal yet" : partnership.proposalStatus}</strong>
            </span>
          )}
        </div>
        {canNegotiate ? (
          <div className="flex flex-wrap gap-2">
            {negotiating ? (
              <>
                <Button variant="secondary" disabled={pending || !anyEnabled} onClick={() => submit("counter")}>
                  Counter proposal
                </Button>
                <Button variant="brand" disabled={pending || !anyEnabled || !canAccept} onClick={() => submit("accept")}>
                  Accept terms
                </Button>
              </>
            ) : (
              <Button variant="brand" disabled={pending || !anyEnabled} onClick={() => submit("send")}>
                {partnership.proposalStatus === "Accepted" ? "Propose changes" : "Send proposal"}
              </Button>
            )}
          </div>
        ) : (
          <span className="text-sm text-slate-500">Your role can view but not change deal terms.</span>
        )}
      </div>
    </div>
  );
}

function MoneyField({ label, value, onChange, step = "1" }: { label: string; value: string; onChange: (v: string) => void; step?: string }) {
  return (
    <Field label={label}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
        <Input type="number" min={0} step={step} value={value} onChange={(e) => onChange(e.target.value)} className="pl-6" />
      </div>
    </Field>
  );
}
