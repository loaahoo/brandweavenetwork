import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

const LINKS = [
  ["Discover", "/#discover"],
  ["Channels", "/#channels"],
  ["How it works", "/#how"],
  ["Infrastructure", "/#infrastructure"],
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="Brand Weave Network home">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" className="hidden sm:inline-flex">
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup">Join the Network</ButtonLink>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-xs">
          <Wordmark />
          <p className="mt-4 text-sm text-slate-500">The partnership network for brands. Stronger brands, woven together.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-16 gap-y-3 text-sm">
          {[
            ["Discover brands", "/#discover"],
            ["Available Channels", "/#channels"],
            ["How partnerships work", "/#how"],
            ["Performance infrastructure", "/#infrastructure"],
            ["Sign in", "/login"],
            ["Join the Network", "/signup"],
          ].map(([label, href]) => (
            <Link key={label} href={href!} className="text-slate-600 hover:text-ink">
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} Brand Weave Network · brandweavenetwork.com</div>
    </footer>
  );
}
