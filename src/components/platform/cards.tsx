import { ArrowRight, BadgeCheck, Clock, Globe, Lock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { BrandAvatar } from "@/components/brand/brand-avatar";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, Chip, StatusBadge } from "@/components/ui/primitives";
import type { BrandMatch } from "@/lib/matching";
import type { Brand, Channel } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

function ChipRow({ label, items, max = 5 }: { label: string; items: string[]; max?: number }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, max).map((i) => (
          <Chip key={i}>{i}</Chip>
        ))}
        {items.length > max && <Chip className="bg-transparent text-slate-400">+{items.length - max}</Chip>}
      </div>
    </div>
  );
}

export function BrandCard({ brand, channels }: { brand: Brand; channels: Channel[] }) {
  return (
    <Card className="flex flex-col p-5 transition-shadow hover:shadow-raised">
      <div className="flex items-start gap-3.5">
        <BrandAvatar brand={brand} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link href={`/brands/${brand.slug}`} className="truncate text-base font-semibold tracking-tight text-ink hover:text-brand-700">
              {brand.name}
            </Link>
            {brand.verified && <BadgeCheck className="size-4 shrink-0 text-brand-500" aria-label="Verified brand" />}
          </div>
          <div className="text-[13px] text-slate-500">
            {brand.industry} · {brand.size}
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-slate-600">{brand.tagline}</p>

      <div className="mt-4 space-y-3.5">
        <ChipRow label="Available channels" items={channels.map((c) => c.name)} max={4} />
        <ChipRow label="Looking for" items={brand.lookingFor} max={4} />
        <ChipRow label="Partnership models" items={brand.partnershipModels} max={4} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="text-xs text-slate-500">
          {channels.length} channel{channels.length === 1 ? "" : "s"} · AOV {formatMoney(brand.averageOrderValueCents, "USD")}
        </span>
        <ButtonLink href={`/brands/${brand.slug}`} variant="secondary" size="sm">
          View Brand <ArrowRight className="size-3.5" />
        </ButtonLink>
      </div>
    </Card>
  );
}

export function MatchCard({ match }: { match: BrandMatch }) {
  const { brand } = match;
  return (
    <Card className="flex flex-col p-5 transition-shadow hover:shadow-raised">
      <div className="flex items-start gap-3">
        <BrandAvatar brand={brand} size="md" />
        <div className="min-w-0 flex-1">
          <Link href={`/brands/${brand.slug}`} className="block truncate text-[15px] font-semibold tracking-tight text-ink hover:text-brand-700">
            {brand.name}
          </Link>
          <div className="text-[13px] text-slate-500">{brand.subcategory}</div>
        </div>
        <Badge tone={match.fit === "Strong fit" ? "green" : match.fit === "Good fit" ? "brand" : "neutral"}>{match.fit}</Badge>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-800">{match.concept}</p>
      <ul className="mt-3 space-y-1.5 text-[13px] text-slate-600">
        {match.reasons.slice(0, 3).map((r) => (
          <li key={r} className="flex gap-2">
            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-brand-400" />
            {r}
          </li>
        ))}
      </ul>
      {match.theirChannels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {match.theirChannels.slice(0, 3).map((c) => (
            <Chip key={c.id}>{c.name}</Chip>
          ))}
        </div>
      )}
      <div className="mt-auto pt-4">
        <ButtonLink href={`/brands/${brand.slug}`} variant="secondary" size="sm" className="w-full">
          View match
        </ButtonLink>
      </div>
    </Card>
  );
}

export function ChannelCard({ channel }: { channel: Channel }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-brand-600">{channel.category}</div>
          <h3 className="mt-0.5 text-base font-semibold tracking-tight text-ink">{channel.name}</h3>
        </div>
        <StatusBadge status={channel.status} />
      </div>
      <p className="mt-2 text-sm text-slate-600">{channel.description}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users className="size-3.5" /> Reach
          </dt>
          <dd className="mt-0.5 font-semibold text-ink">{channel.reachLabel}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="size-3.5" /> Geography
          </dt>
          <dd className="mt-0.5 text-slate-800">{channel.geography.join(", ")}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-500">
            <Globe className="size-3.5" /> Audience
          </dt>
          <dd className="mt-0.5 text-slate-800">{channel.segment}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="size-3.5" /> Minimum commitment
          </dt>
          <dd className="mt-0.5 text-slate-800">{channel.minimumCommitment}</dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3.5 border-t border-slate-100 pt-4">
        <ChipRow label="Available partnership models" items={channel.partnershipTypes} />
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">Compensation preference</div>
          <div className="text-sm text-slate-800">{channel.compensationPreference}</div>
        </div>
        <ChipRow label="Placement examples" items={channel.placements} max={4} />
        <ChipRow label="Partner categories desired" items={channel.desiredPartnerCategories} max={6} />
        {channel.restrictions.length > 0 && (
          <div>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">Restrictions</div>
            <ul className="list-disc space-y-0.5 pl-4 text-[13px] text-slate-600">
              {channel.restrictions.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        {channel.approvalRequired && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="size-3.5" /> Approval required
          </div>
        )}
      </div>
    </Card>
  );
}
