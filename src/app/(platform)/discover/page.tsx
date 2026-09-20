import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandCard, MatchCard } from "@/components/platform/cards";
import { DiscoverFilterBar } from "@/components/platform/discover-filters";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { getDirectory } from "@/lib/db/directory";
import { matchBrands } from "@/lib/matching";
import { currentBrand, discoverBrands, type DiscoverFilters } from "@/lib/queries";

export const metadata: Metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

const KEYS = ["q", "industry", "category", "audience", "geography", "size", "channel", "model", "presence", "type", "aov", "stage"] as const;

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const sp = await searchParams;
  const filters: DiscoverFilters = {};
  for (const k of KEYS) {
    const v = sp[k];
    if (typeof v === "string" && v) filters[k] = v.slice(0, 100);
  }
  const filtered = Object.keys(filters).length > 0;

  const dir = await getDirectory();
  const me = currentBrand(dir);
  const results = discoverBrands(dir, filters, me.id);
  const matches = filtered ? [] : matchBrands(me, dir, { limit: 3 });

  return (
    <>
      <PageHeader title="Discover" description="Find brands that complement your customer experience." />

      <Suspense fallback={<div className="h-28" />}>
        <DiscoverFilterBar />
      </Suspense>

      {matches.length > 0 && (
        <section className="mt-8" aria-labelledby="matches-h">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="matches-h" className="text-lg font-semibold tracking-tight text-ink">
              Brand Matches for {me.name}
            </h2>
            <span className="text-[13px] text-slate-500">Based on audience, category, channels and geography</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((m) => (
              <MatchCard key={m.brand.id} match={m} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" aria-labelledby="results-h">
        <h2 id="results-h" className="mb-3 text-lg font-semibold tracking-tight text-ink">
          {filtered ? `${results.length} brand${results.length === 1 ? "" : "s"}` : "All brands"}
        </h2>
        {results.length === 0 ? (
          <EmptyState icon={<SearchX />} title="No brands match those filters" description="Try removing a filter or searching a broader term. New brands join the network every week." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map(({ brand, channels }) => (
              <BrandCard key={brand.id} brand={brand} channels={channels} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
