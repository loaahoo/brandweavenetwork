"use client";

import { UserPlus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { inviteTeammate, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/primitives";
import { ROLES } from "@/lib/constants";

export function InviteForm({ disabled }: { disabled?: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <form
      ref={ref}
      className="flex flex-wrap items-start gap-2"
      action={(fd) =>
        start(async () => {
          const r = await inviteTeammate(fd);
          setResult(r);
          if (r.ok) ref.current?.reset();
        })
      }
    >
      <Input name="email" type="email" required placeholder="teammate@company.com" aria-label="Teammate email" className="w-64" disabled={disabled} />
      <Select name="role" defaultValue="partnership_manager" aria-label="Role" className="w-52" disabled={disabled}>
        {ROLES.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="brand" disabled={pending || disabled}>
        <UserPlus className="size-4" /> {pending ? "Inviting…" : "Invite"}
      </Button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`basis-full text-sm ${result.ok ? "text-emerald-700" : "text-red-600"}`}>
          {result.ok ? result.message : result.error}
        </p>
      )}
    </form>
  );
}
