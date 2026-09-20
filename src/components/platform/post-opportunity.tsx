"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { postOpportunity, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import { COMPENSATION_MODELS } from "@/lib/constants";

export function PostOpportunityDialog() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <Dialog
      title="Post an opportunity"
      description="Let complementary brands find you — even when you don't know who the ideal partner is."
      trigger={(open) => (
        <Button onClick={() => { setResult(null); open(); }}>
          <Plus className="size-4" /> Post opportunity
        </Button>
      )}
    >
      {(close) => (
        <form
          className="space-y-4"
          action={(fd) =>
            start(async () => {
              const r = await postOpportunity(fd);
              setResult(r);
              if (r.ok) setTimeout(close, 1200);
            })
          }
        >
          <Field label="Title">
            <Input name="title" required maxLength={100} placeholder="Travel Partner Program" />
          </Field>
          <Field label="Potential partnership">
            <Textarea name="concept" required minLength={20} maxLength={1200} />
          </Field>
          <Field label="Looking for" hint="Comma-separated: Airlines, Hotels, Experiences">
            <Input name="lookingFor" required />
          </Field>
          <Field label="Available from you" hint="Comma-separated: Affiliate commission, Product samples, Co-marketing">
            <Input name="offering" />
          </Field>
          <Field label="Channels wanted" hint="Comma-separated: Booking confirmation, Email, Loyalty">
            <Input name="channelsWanted" />
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-slate-700">Compensation models</legend>
            <div className="flex flex-wrap gap-2">
              {COMPENSATION_MODELS.map((m) => (
                <label key={m} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[13px] has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800">
                  <input type="checkbox" name="models" value={m} className="size-3.5 accent-brand-600" />
                  {m}
                </label>
              ))}
            </div>
          </fieldset>
          {result && (
            <p role={result.ok ? "status" : "alert"} className={`text-sm ${result.ok ? "text-emerald-700" : "text-red-600"}`}>
              {result.ok ? result.message : result.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={pending || result?.ok === true}>
              {pending ? "Posting…" : "Post opportunity"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
