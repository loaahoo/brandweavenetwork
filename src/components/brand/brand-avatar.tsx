import { cn, initials } from "@/lib/utils";
import type { Brand } from "@/lib/types";

const SIZES = {
  xs: "size-6 rounded-md text-[10px]",
  sm: "size-8 rounded-lg text-xs",
  md: "size-10 rounded-xl text-sm",
  lg: "size-14 rounded-2xl text-lg",
  xl: "size-20 rounded-3xl text-2xl",
} as const;

/** Stand-in for uploaded logos: a tile in the brand colour with its initials. */
export function BrandAvatar({ brand, size = "md", className }: { brand: Pick<Brand, "name" | "color">; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center font-semibold tracking-tight text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]", SIZES[size], className)}
      style={{ background: `linear-gradient(140deg, ${brand.color}, color-mix(in srgb, ${brand.color} 78%, black))` }}
      aria-hidden
    >
      {initials(brand.name)}
    </span>
  );
}

/** Two avatars overlapped, for partnership headers. */
export function PairAvatar({ a, b, size = "md" }: { a: Brand; b: Brand; size?: keyof typeof SIZES }) {
  return (
    <span className="inline-flex -space-x-2">
      <BrandAvatar brand={a} size={size} className="ring-2 ring-white" />
      <BrandAvatar brand={b} size={size} className="ring-2 ring-white" />
    </span>
  );
}
