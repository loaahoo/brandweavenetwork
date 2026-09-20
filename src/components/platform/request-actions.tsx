"use client";

import { useState, useTransition } from "react";
import { respondToRequest, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function RequestActions({ requestId, status }: { requestId: string; status: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  if (status === "Accepted" || status === "Declined") return null;

  const act = (d: "Accepted" | "Declined" | "Question") => start(async () => setResult(await respondToRequest(requestId, d)));

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="brand" disabled={pending} onClick={() => act("Accepted")}>
          Accept
        </Button>
        <Button size="sm" variant="secondary" disabled={pending || status === "Question"} onClick={() => act("Question")}>
          Ask a question
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("Declined")}>
          Decline
        </Button>
      </div>
      {result && !result.ok && (
        <p role="alert" className="text-xs text-red-600">
          {result.error}
        </p>
      )}
    </div>
  );
}
