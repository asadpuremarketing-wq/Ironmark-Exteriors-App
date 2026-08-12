"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/leads";
import type { LeadStatus } from "@prisma/client";

export default function QuickStatusSelect({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [isPending, startTransition] = useTransition();

  async function handleChange(next: LeadStatus) {
    setCurrent(next);
    await fetch(`/api/leads/${leadId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <select
      value={current}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => handleChange(e.target.value as LeadStatus)}
      className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide outline-none ${STATUS_STYLES[current]} disabled:opacity-60`}
    >
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
