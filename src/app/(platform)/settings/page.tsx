import { Check } from "lucide-react";
import type { Metadata } from "next";
import { InviteForm } from "@/components/platform/invite-form";
import { Card, CardHeader, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui/primitives";
import { can, ROLES, ROLE_PERMISSIONS, type Permission } from "@/lib/constants";
import { CURRENT_USER } from "@/lib/data/ledger";
import { getDirectory } from "@/lib/db/directory";
import { listTeam } from "@/lib/db/network";
import { currentBrand } from "@/lib/queries";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const PERMISSION_LABELS: [Permission, string][] = [
  ["team.manage", "Manage team"],
  ["profile.edit", "Edit brand profile"],
  ["channels.manage", "Manage channels"],
  ["connections.send", "Send requests & apply"],
  ["deal.negotiate", "Negotiate terms"],
  ["deal.accept", "Accept deals"],
  ["links.create", "Create tracking links"],
  ["assets.manage", "Manage assets"],
  ["messages.send", "Send messages"],
  ["finance.view", "View finance"],
  ["finance.manage", "Manage payouts"],
  ["analytics.view", "View analytics"],
  ["integrations.manage", "Manage integrations"],
];

export default async function SettingsPage() {
  const brand = currentBrand(await getDirectory());
  const team = await listTeam(brand.id);
  const roleLabel = (id: string) => ROLES.find((r) => r.id === id)?.label ?? id;

  return (
    <>
      <PageHeader title="Settings" description={`Team and permissions for ${brand.name}. Every account belongs to one organization; roles apply across all of its partnerships.`} />

      <Card>
        <CardHeader title="Team" description={`${team.length} members`} />
        <div className="border-b border-slate-100 p-5">
          <InviteForm disabled={!can(CURRENT_USER.role, "team.manage")} />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.id}>
                <Td className="font-medium text-ink">
                  {m.name}
                  {m.id === CURRENT_USER.id && <span className="ml-2 text-xs font-normal text-slate-400">you</span>}
                </Td>
                <Td>{m.email}</Td>
                <Td>{roleLabel(m.role)}</Td>
                <Td>
                  <StatusBadge status={m.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Roles & permissions" description="Enforced on the server for every action, not just hidden in the UI." />
        <Table>
          <thead>
            <tr>
              <Th>Permission</Th>
              {ROLES.map((r) => (
                <Th key={r.id} className="text-center">
                  {r.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_LABELS.map(([perm, label]) => (
              <tr key={perm}>
                <Td className="font-medium text-slate-800">{label}</Td>
                {ROLES.map((r) => (
                  <Td key={r.id} className="text-center">
                    {ROLE_PERMISSIONS[r.id].includes(perm) ? <Check className="mx-auto size-4 text-emerald-600" aria-label="Allowed" /> : <span className="text-slate-300" aria-label="Not allowed">—</span>}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
