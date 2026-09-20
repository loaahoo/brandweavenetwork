import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <LogoMark className="size-12" />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-md text-slate-600">The link may be out of date, or the partnership isn&apos;t part of your organization.</p>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/home">Go to Home</ButtonLink>
        <Link href="/" className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
          Back to site
        </Link>
      </div>
    </div>
  );
}
