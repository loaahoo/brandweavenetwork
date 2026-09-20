import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandAvatar } from "@/components/brand/brand-avatar";
import { PostOpportunityDialog } from "@/components/platform/post-opportunity";
import { ApplyDialog } from "@/components/platform/request-dialog";
import { Badge, Card, Chip, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { CURRENT_BRAND_ID } from "@/lib/data/brands";
import { getDirectory } from "@/lib/db/directory";
import { appliedOpportunityIds, listOpportunities } from "@/lib/db/network";
import type { Brand, Opportunity } from "@/lib/types";
import { formatDate, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Opportunities" };
export const dynamic = "force-dynamic";

function List({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <Chip key={i}>{i}</Chip>
        ))}
      </div>
    </div>
  );
}

function OpportunityCard({ o, brand, mine, applied }: { o: Opportunity; brand: Brand; mine: boolean; applied: boolean }) {
  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandAvatar brand={brand} size="sm" />
          <div className="text-[13px] text-slate-500">
            Posted by{" "}
            <Link href={`/brands/${brand.slug}`} className="font-medium text-slate-800 hover:text-brand-700">
              {brand.name}
            </Link>{" "}
            · {formatDate(o.postedAt, { month: "short", day: "numeric" })}
          </div>
        </div>
        <StatusBadge status={o.status} />
      </div>

      <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink">{o.title}</h2>
      <p className="mt-1.5 text-[15px] text-slate-600">{o.concept}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <List label="Looking for" items={o.lookingFor} />
        <List label="Available from them" items={o.offering} />
        <List label="Channels wanted" items={o.channelsWanted} />
        <List label="Compensation" items={o.models} />
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 mt-6">
        <span className="text-xs text-slate-500">
          {pluralize(o.applicants, "application")}
          {o.closesAt && ` · closes ${formatDate(o.closesAt, { month: "short", day: "numeric" })}`}
        </span>
        {mine ? (
          <Badge tone="brand">Your opportunity</Badge>
        ) : applied ? (
          <Badge tone="green">Applied</Badge>
        ) : (
          <ApplyDialog opportunityId={o.id} title={o.title} brandName={brand.name} disabled={o.status === "Closed"} />
        )}
      </div>
    </Card>
  );
}

export default async function OpportunitiesPage({ searchParams }: PageProps<"/opportunities">) {
  const sp = await searchParams;
  const tab = sp.tab === "mine" ? "mine" : "browse";
  const [dir, all, applied] = await Promise.all([getDirectory(), listOpportunities(), appliedOpportunityIds(CURRENT_BRAND_ID)]);
  const list = all.filter((o) => (tab === "mine" ? o.brandId === CURRENT_BRAND_ID : o.brandId !== CURRENT_BRAND_ID));

  return (
    <>
      <PageHeader
        title="Opportunities"
        description="Open partnership concepts from brands looking for the right partner. Apply, or post your own."
        actions={<PostOpportunityDialog />}
      />

      <div role="tablist" className="mb-6 inline-flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
        {[
          ["browse", "Browse opportunities"],
          ["mine", "Your opportunities"],
        ].map(([id, label]) => (
          <Link
            key={id}
            role="tab"
            aria-selected={tab === id}
            href={id === "browse" ? "/opportunities" : "/opportunities?tab=mine"}
            className={`rounded-md px-3.5 py-1.5 ${tab === id ? "bg-white text-ink shadow-card" : "text-slate-500 hover:text-slate-800"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<Sparkles />}
          title={tab === "mine" ? "You haven't posted an opportunity yet" : "No open opportunities right now"}
          description={tab === "mine" ? "Describe the kind of partner you're looking for and let complementary brands come to you." : "Check back soon, or post your own."}
          action={<PostOpportunityDialog />}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {list.map((o) => (
            <OpportunityCard key={o.id} o={o} brand={dir.brand(o.brandId)!} mine={o.brandId === CURRENT_BRAND_ID} applied={applied.has(o.id)} />
          ))}
        </div>
      )}
    </>
  );
}
