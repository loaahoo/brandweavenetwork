"use client";

import { Paperclip, Send, StickyNote } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { sendMessage, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/** Composer for a Deal Room thread. Messages stay tied to the partnership; notes are internal to your team. */
export function MessageComposer({ partnershipId, disabled }: { partnershipId: string; disabled?: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [note, setNote] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <form
      ref={formRef}
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-card focus-within:border-brand-400 focus-within:ring-3 focus-within:ring-brand-500/15"
      action={(fd) =>
        start(async () => {
          fd.set("kind", note ? "note" : "message");
          const r = await sendMessage(partnershipId, fd);
          setResult(r);
          if (r.ok) formRef.current?.reset();
        })
      }
    >
      <Textarea
        name="body"
        required
        maxLength={4000}
        disabled={disabled}
        placeholder={note ? "Add a private note for your team…" : "Write a message to the partner. Use @name to mention a teammate."}
        aria-label="Message"
        className="min-h-20 resize-none border-0 bg-transparent px-1 shadow-none focus:ring-0"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setNote((n) => !n)}
            aria-pressed={note}
            className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium", note ? "bg-amber-50 text-amber-800" : "text-slate-500 hover:bg-slate-100")}
          >
            <StickyNote className="size-4" /> {note ? "Internal note" : "Make internal note"}
          </button>
          <span className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] text-slate-400" title="File uploads arrive with object storage">
            <Paperclip className="size-4" /> Attach
          </span>
        </div>
        <div className="flex items-center gap-3">
          {result && !result.ok && (
            <span role="alert" className="text-xs text-red-600">
              {result.error}
            </span>
          )}
          <Button type="submit" variant={note ? "secondary" : "brand"} size="sm" disabled={pending || disabled}>
            <Send className="size-3.5" /> {pending ? "Sending…" : note ? "Save note" : "Send"}
          </Button>
        </div>
      </div>
    </form>
  );
}
