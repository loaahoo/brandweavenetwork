"use client";

import { useState, useTransition } from "react";
import { applyToOpportunity, sendConnectionRequest, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/primitives";
import { COMPENSATION_MODELS } from "@/lib/constants";
import type { Channel } from "@/lib/types";

function Feedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p role={result.ok ? "status" : "alert"} className={`text-sm ${result.ok ? "text-emerald-700" : "text-red-600"}`}>
      {result.ok ? result.message : result.error}
    </p>
  );
}

/** Connection request: intro, idea, channels of interest, commercial structure. */
export function RequestPartnershipDialog({
  brandId,
  brandName,
  channels,
  disabled,
}: {
  brandId: string;
  brandName: string;
  channels: Channel[];
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <Dialog
      title={`Request a partnership with ${brandName}`}
      description="They can accept, decline, or ask a question. Accepting opens a private Deal Room."
      trigger={(open) => (
        <Button variant="brand" onClick={() => { setResult(null); open(); }} disabled={disabled}>
          Request Partnership
        </Button>
      )}
    >
      {(close) => (
        <form
          className="space-y-4"
          action={(fd) =>
            start(async () => {
              const r = await sendConnectionRequest(fd);
              setResult(r);
              if (r.ok) setTimeout(close, 1400);
            })
          }
        >
          <input type="hidden" name="toBrandId" value={brandId} />
          <Field label="Short introduction">
            <Textarea name="intro" required minLength={10} maxLength={600} placeholder={`Hi ${brandName} team — we're…`} className="min-h-20" />
          </Field>
          <Field label="Partnership idea" hint="What could you do together for your shared customers?">
            <Textarea name="idea" required minLength={10} maxLength={1200} />
          </Field>
          {channels.length > 0 && (
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-slate-700">Channels of interest</legend>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {channels.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                    <input type="checkbox" name="channels" value={c.id} className="size-4 accent-brand-600" />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <Field label="Potential commercial structure">
            <Select name="structure" defaultValue="Open to discuss">
              <option>Open to discuss</option>
              {COMPENSATION_MODELS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Feedback result={result} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={pending || result?.ok === true}>
              {pending ? "Sending…" : "Send request"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

export function ApplyDialog({ opportunityId, title, brandName, disabled }: { opportunityId: string; title: string; brandName: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <Dialog
      title={`Apply to “${title}”`}
      description={`Your application goes to ${brandName}. If they're interested, a Deal Room opens.`}
      trigger={(open) => (
        <Button variant="brand" onClick={() => { setResult(null); open(); }} disabled={disabled}>
          Apply to Partner
        </Button>
      )}
    >
      {(close) => (
        <form
          className="space-y-4"
          action={(fd) =>
            start(async () => {
              const r = await applyToOpportunity(fd);
              setResult(r);
              if (r.ok) setTimeout(close, 1400);
            })
          }
        >
          <input type="hidden" name="opportunityId" value={opportunityId} />
          <Field label="Why are you a fit?" hint="Describe your audience, the channels you'd contribute, and how you'd like to be paid.">
            <Textarea name="pitch" required minLength={20} maxLength={1200} className="min-h-32" />
          </Field>
          <Feedback result={result} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={pending || result?.ok === true}>
              {pending ? "Sending…" : "Submit application"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
