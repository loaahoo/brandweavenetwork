"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { createTrackingLink, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Field, Input, Select } from "@/components/ui/primitives";
import type { LinkKind } from "@/lib/types";

export interface GeneratorOption {
  partnershipId: string;
  partnershipName: string;
  directionId: string;
  payerName: string;
  payerHost: string;
  channels: { id: string; name: string }[];
}

const KINDS: LinkKind[] = ["Standard", "Campaign", "Placement", "Product", "Deep link", "QR code"];

export function LinkGenerator({ options }: { options: GeneratorOption[] }) {
  const [sel, setSel] = useState(options[0]?.directionId ?? "");
  const opt = useMemo(() => options.find((o) => o.directionId === sel), [options, sel]);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult<{ code: string }> | null>(null);
  const [copied, setCopied] = useState(false);

  if (options.length === 0) {
    return (
      <Card className="p-6 text-sm text-slate-600">
        You can create tracking links once a partnership has terms where you contribute channels. Set them up in the Deal Builder.
      </Card>
    );
  }

  const url = result?.ok && result.data ? `${window.location.origin}/r/${result.data.code}` : "";

  return (
    <Card>
      <CardHeader title="Create a tracking link" description="Every click gets a unique click ID, so sales can be attributed to the exact placement." />
      <form
        className="grid gap-4 p-5 sm:grid-cols-2"
        action={(fd) =>
          start(async () => {
            setCopied(false);
            setResult(await createTrackingLink(fd));
          })
        }
      >
        <Field label="Partnership">
          <Select
            name="directionId"
            value={sel}
            onChange={(e) => setSel(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.directionId} value={o.directionId}>
                Promote {o.payerName} · {o.partnershipName}
              </option>
            ))}
          </Select>
        </Field>
        <input type="hidden" name="partnershipId" value={opt?.partnershipId ?? ""} />
        <Field label="Link type">
          <Select name="kind" defaultValue="Campaign">
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </Select>
        </Field>
        <Field label="Destination" hint={`Must be on ${opt?.payerHost ?? "the paying brand's site"}`} className="sm:col-span-2">
          <Input name="destination" required placeholder={`${opt?.payerHost ?? "example.com"}/products/…`} inputMode="url" />
        </Field>
        <Field label="Campaign">
          <Input name="campaignName" placeholder="Q4 Holiday" maxLength={80} />
        </Field>
        <Field label="Channel">
          <Select name="channelId" defaultValue="">
            <option value="">Not specified</option>
            {opt?.channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Placement">
          <Input name="placement" placeholder="Hero card below itinerary" maxLength={120} />
        </Field>
        <Field label="Creative">
          <Input name="creative" placeholder="hero-v3" maxLength={80} />
        </Field>

        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" variant="brand" disabled={pending}>
            <Link2 className="size-4" /> {pending ? "Creating…" : "Create link"}
          </Button>
          {result && !result.ok && (
            <span role="alert" className="text-sm text-red-600">
              {result.error}
            </span>
          )}
        </div>

        {url && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 sm:col-span-2" role="status">
            <div className="min-w-0">
              <div className="text-xs font-medium text-emerald-800">Link created</div>
              <code className="block truncate font-mono text-sm text-emerald-950">{url}</code>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                } catch {
                  /* clipboard unavailable: the URL is selectable above */
                }
              }}
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}
