import { Megaphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/platform/profile-form";
import { ChannelCard } from "@/components/platform/cards";
import { ButtonLink } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/primitives";
import { can } from "@/lib/constants";
import { getDirectory } from "@/lib/db/directory";
import { CURRENT_USER } from "@/lib/data/ledger";
import { currentBrand } from "@/lib/queries";

export const metadata: Metadata = { title: "Brand Profile" };
export const dynamic = "force-dynamic";

export default async function BrandProfilePage() {
  const dir = await getDirectory();
  const brand = currentBrand(dir);
  const channels = dir.channelsFor(brand.id);

  return (
    <>
      <PageHeader
        title="Brand Profile"
        description="How other brands see you in Discover: your audience, what you're looking for, and the channels you make available."
        actions={
          <ButtonLink href={`/brands/${brand.slug}`} variant="secondary">
            View public profile
          </ButtonLink>
        }
      />

      <ProfileForm key={brand.description + brand.tagline} brand={brand} canEdit={can(CURRENT_USER.role, "profile.edit")} />

      <section className="mt-10" aria-labelledby="ch-h">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="ch-h" className="text-lg font-semibold tracking-tight text-ink">
            Available Channels
          </h2>
          <span className="text-[13px] text-slate-500">Marketing surfaces you&apos;re willing to make available to partners</span>
        </div>
        {channels.length === 0 ? (
          <Card className="flex flex-col items-center p-10 text-center">
            <Megaphone className="mb-3 size-8 text-brand-500" />
            <p className="text-sm text-slate-600">List email, app, checkout, packaging and other surfaces so partners can find you.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {channels.map((c) => (
              <ChannelCard key={c.id} channel={c} />
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Channel editing arrives next; listings above are seeded.{" "}
          <Link href="/discover" className="font-medium text-brand-700 hover:underline">
            See how partners&apos; listings look
          </Link>
          .
        </p>
      </section>
    </>
  );
}
