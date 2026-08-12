"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/jobs";
import type { JobStatus } from "@prisma/client";

export default function QuickJobStatusSelect({
  jobId,
  status,
}: {
  jobId: string;
  status: JobStatus;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [isPending, startTransition] = useTransition();

  // Completed/Cancelled jobs are final — changing them back requires opening
  // the job and doing it deliberately, not a stray dropdown click in a list.
  const isLocked = status === "COMPLETED" || status === "CANCELLED";

  async function handleChange(next: JobStatus) {
    if (next === "COMPLETED") return; // completion requires a final price — use the job detail page
    setCurrent(next);
    await fetch(`/api/jobs/${jobId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    startTransition(() => router.refresh());
  }

  if (isLocked) {
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLES[current]}`}
      >
        {STATUS_LABELS[current]}
      </span>
    );
  }

  return (
    <select
      value={current}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => handleChange(e.target.value as JobStatus)}
      className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide outline-none ${STATUS_STYLES[current]} disabled:opacity-60`}
    >
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value} disabled={value === "COMPLETED"}>
          {label}
        </option>
      ))}
    </select>
  );
}
