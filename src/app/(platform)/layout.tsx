import { AppShell } from "@/components/platform/app-shell";
import { ROLES } from "@/lib/constants";
import { CURRENT_USER } from "@/lib/data/ledger";
import { currentBrand } from "@/lib/queries";
import { store } from "@/lib/store";

/**
 * Authenticated application shell. Session is the demo user; replace `CURRENT_USER`
 * with the auth provider's session and redirect to /login when absent.
 */
export default function PlatformLayout({ children }: LayoutProps<"/">) {
  const brand = currentBrand();
  const pendingRequests = store().requests.filter((r) => r.toBrandId === brand.id && r.status === "Pending").length;
  const newOpportunities = store().opportunities.filter((o) => o.brandId !== brand.id && o.status === "Open").length;

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
