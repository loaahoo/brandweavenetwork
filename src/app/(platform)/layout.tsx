import { AppShell } from "@/components/platform/app-shell";
import { ROLES } from "@/lib/constants";
import { CURRENT_USER } from "@/lib/data/ledger";
import { getDirectory } from "@/lib/db/directory";
import { countOpenOpportunities, countPendingRequests } from "@/lib/db/network";
import { currentBrand } from "@/lib/queries";

/**
 * Authenticated application shell. Session is the demo user; replace `CURRENT_USER`
 * with the auth provider's session and redirect to /login when absent.
 */
export default async function PlatformLayout({ children }: LayoutProps<"/">) {
  const brand = currentBrand(await getDirectory());
  const [pendingRequests, newOpportunities] = await Promise.all([countPendingRequests(brand.id), countOpenOpportunities(brand.id)]);

  return (
    <AppShell
      brand={brand}
      user={CURRENT_USER}
      roleLabel={ROLES.find((r) => r.id === CURRENT_USER.role)!.label}
      badges={{ "/partnerships": pendingRequests, "/opportunities": newOpportunities }}
    >
      {children}
    </AppShell>
  );
}
