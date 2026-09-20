"use client";

import { useState, useTransition } from "react";
import { updateBrandProfile, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Field, Input, Textarea } from "@/components/ui/primitives";
import { COMPENSATION_MODELS } from "@/lib/constants";
import type { Brand } from "@/lib/types";

export function ProfileForm({ brand, canEdit }: { brand: Brand; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const a = brand.audience;
  const num = (n?: number) => (n === undefined ? "" : String(n));

  return (
    <form
      action={(fd) =>
        start(async () => {
          setResult(await updateBrandProfile(fd));
        })
      }
      className="space-y-6"
    >
      <fieldset disabled={!canEdit || pending} className="space-y-6">
        <Card>
          <CardHeader title="Basic information" description="Not every field is required. Complete profiles get better Brand Matches." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Brand name" hint="Contact support to change your brand name.">
              <Input value={brand.name} readOnly disabled />
            </Field>
            <Field label="Website">
              <Input value={brand.website} readOnly disabled />
            </Field>
            <Field label="Tagline" className="sm:col-span-2">
              <Input name="tagline" defaultValue={brand.tagline} maxLength={140} />
            </Field>
            <Field label="Company description" className="sm:col-span-2">
              <Textarea name="description" defaultValue={brand.description} required minLength={20} maxLength={1200} />
            </Field>
            <Field label="Headquarters">
              <Input name="headquarters" defaultValue={brand.headquarters} maxLength={80} />
            </Field>
            <Field label="Average order value (USD)">
              <Input name="aov" inputMode="decimal" defaultValue={String(brand.averageOrderValueCents / 100)} />
            </Field>
            <div className="grid grid-cols-3 gap-4 sm:col-span-2">
              <ReadOnly label="Industry" value={brand.industry} />
              <ReadOnly label="Business type" value={brand.businessType} />
              <ReadOnly label="Presence" value={brand.presence} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Audience" description="Describe your customers so partners can judge the fit." />
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Primary audience" className="sm:col-span-2 lg:col-span-3">
              <Input name="primaryAudience" defaultValue={a.primary} maxLength={120} />
            </Field>
            {(
              [
                ["monthlyCustomers", "Monthly customers", a.monthlyCustomers],
                ["monthlyTraffic", "Monthly site traffic", a.monthlyTraffic],
                ["appUsers", "App users", a.appUsers],
                ["emailSubscribers", "Email subscribers", a.emailSubscribers],
                ["loyaltyMembers", "Loyalty / member base", a.loyaltyMembers],
                ["socialFollowing", "Social following", a.socialFollowing],
              ] as const
            ).map(([name, label, v]) => (
              <Field key={name} label={label}>
                <Input name={name} inputMode="numeric" defaultValue={num(v)} placeholder="Optional" />
              </Field>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Partnership preferences" />
          <div className="space-y-4 p-5">
            <Field label="Looking for" hint="Comma-separated: Travel booking platforms, Hotels, Airlines">
              <Input name="lookingFor" defaultValue={brand.lookingFor.join(", ")} />
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-slate-700">Partnership models</legend>
              <div className="flex flex-wrap gap-2">
                {COMPENSATION_MODELS.map((m) => (
                  <label key={m} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800">
                    <input type="checkbox" name="models" value={m} defaultChecked={brand.partnershipModels.includes(m)} className="size-3.5 accent-brand-600" />
                    {m}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </Card>
      </fieldset>

      <div className="flex items-center gap-4">
        <Button type="submit" variant="brand" disabled={!canEdit || pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        {result && (
          <span role={result.ok ? "status" : "alert"} className={`text-sm ${result.ok ? "text-emerald-700" : "text-red-600"}`}>
            {result.ok ? result.message : result.error}
          </span>
        )}
        {!canEdit && <span className="text-sm text-slate-500">Your role can view but not edit the brand profile.</span>}
      </div>
    </form>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[13px] font-medium text-slate-700">{label}</div>
      <div className="flex h-9 items-center rounded-lg bg-slate-50 px-3 text-sm text-slate-600">{value}</div>
    </div>
  );
}
