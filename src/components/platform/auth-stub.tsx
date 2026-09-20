import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

/**
 * Placeholder for the auth provider (Clerk / Auth.js with organizations).
 * It deliberately has no password field: nothing here would verify one.
 */
export function AuthStub({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-5 py-12">
      <Link href="/" aria-label="Brand Weave Network home" className="mb-8">
        <Wordmark />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-raised">
        <LogoMark className="mb-5 size-10" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{signup ? "Join the Network" : "Sign in"}</h1>
        <p className="mt-2 text-[15px] text-slate-600">
          {signup
            ? "Create a brand organization, invite your team and list your Available Channels."
            : "Welcome back. Pick up where your partnerships left off."}
        </p>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong className="font-semibold">Demo workspace.</strong> Authentication isn&apos;t connected yet; it plugs in through an organization-aware provider (Clerk or Auth.js).
          Until then you can explore as <strong>Maya Okafor</strong>, Owner at <strong>Lumen Labs</strong>.
        </div>

        <ButtonLink href="/home" size="lg" variant="brand" className="mt-6 w-full">
          Enter the demo workspace
        </ButtonLink>
        <p className="mt-5 text-center text-sm text-slate-500">
          {signup ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-brand-700 hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New to Brand Weave?{" "}
              <Link href="/signup" className="font-medium text-brand-700 hover:underline">
                Join the Network
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
