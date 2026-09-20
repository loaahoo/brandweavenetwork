"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Modal built on the native <dialog>: focus trap, Esc-to-close and inert
 * background come from the platform. `trigger` renders the opener.
 */
export function Dialog({
  trigger,
  title,
  description,
  children,
  className,
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description?: string;
  children: (close: () => void) => ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isOpen && !el.open) el.showModal();
    if (!isOpen && el.open) el.close();
  }, [isOpen]);

  return (
    <>
      {trigger(() => setOpen(true))}
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === ref.current && setOpen(false)}
        className={cn(
          "m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-slate-200 bg-white p-0 shadow-float backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]",
          className,
        )}
        aria-labelledby="dialog-title"
      >
        {isOpen && (
          <div className="max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <h2 id="dialog-title" className="text-lg font-semibold tracking-tight text-ink">
                  {title}
                </h2>
                {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="px-6 py-5">{children(() => setOpen(false))}</div>
          </div>
        )}
      </dialog>
    </>
  );
}
