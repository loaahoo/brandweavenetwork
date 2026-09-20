import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PairAvatar } from "@/components/brand/brand-avatar";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { CURRENT_BRAND_ID } from "@/lib/data/brands";
import { currentBrand, myPartnerships, partnerOf } from "@/lib/queries";
import { store } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default function MessagesPage() {
  const me = currentBrand();
  const rows = myPartnerships()
    .map((p) => {
      const thread = store()
        .messages.filter((m) => m.partnershipId === p.id && (m.kind !== "note" || m.authorBrandId === CURRENT_BRAND_ID))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { p, partner: partnerOf(p), last: thread.at(-1), count: thread.filter((m) => m.kind !== "system").length };
    })
    .sort((a, b) => (b.last?.createdAt ?? "").localeCompare(a.last?.createdAt ?? ""));

  return (
    <>
      <PageHeader title="Messages" description="Conversations live inside each partnership, so context, terms and files stay together." />
      {rows.length === 0 ? (
        <EmptyState icon={<MessagesSquare />} title="No conversations yet" description="Once a connection request is accepted, a Deal Room opens with its own private thread." />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {rows.map(({ p, partner, last, count }) => (
              <li key={p.id}>
                <Link href={`/partnerships/${p.id}?tab=messages`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
                  <PairAvatar a={me} b={partner} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{p.name}</span>
                      <Badge tone={p.stage === "Live" ? "green" : "brand"}>{p.stage}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-slate-500">
                      {last ? (
                        <>
                          <span className="font-medium text-slate-700">{last.kind === "system" ? "System" : last.authorName}:</span> {last.body}
                        </>
                      ) : (
                        "No messages yet"
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {last && <div className="text-xs text-slate-400">{timeAgo(last.createdAt)}</div>}
                    <div className="mt-0.5 text-xs text-slate-400">{count} messages</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
