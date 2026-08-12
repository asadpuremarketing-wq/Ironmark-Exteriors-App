"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JobStatus } from "@prisma/client";

export default function JobStatusActions({
  jobId,
  status,
  quotedPrice,
}: {
  jobId: string;
  status: JobStatus;
  quotedPrice: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [finalPrice, setFinalPrice] = useState(quotedPrice !== null ? String(quotedPrice) : "");

  const isDone = status === "COMPLETED" || status === "CANCELLED";

  async function quickStatus(next: JobStatus) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update status.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setBusy(false);
      setShowCancelConfirm(false);
    }
  }

  async function completeJob() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalPrice }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Failed to complete job.");
      }
      setShowCompleteForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete job.");
    } finally {
      setBusy(false);
    }
  }

  if (isDone) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {status !== "IN_PROGRESS" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => quickStatus("IN_PROGRESS")}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-brand-electric/40 hover:text-brand-electric disabled:opacity-60"
          >
            Mark In Progress
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowCompleteForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
        >
          Mark Completed
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowCancelConfirm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          Cancel Job
        </button>
      </div>

      {showCompleteForm && (
        <div className="w-full max-w-xs rounded-xl border border-green-200 bg-green-50 p-4">
          <label className="text-xs font-bold text-green-900">Final Price</label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-green-900/50">
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={finalPrice}
              onChange={(e) => setFinalPrice(e.target.value)}
              className="w-full rounded-lg border border-green-300 bg-white py-2 pl-7 pr-3 text-sm outline-none"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy || !finalPrice}
              onClick={completeJob}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Confirm Completion"}
            </button>
            <button
              type="button"
              onClick={() => setShowCompleteForm(false)}
              className="rounded-md border border-green-300 px-3 py-1.5 text-xs font-bold text-green-900 hover:bg-green-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <span className="text-xs font-semibold text-red-700">Cancel this job?</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => quickStatus("CANCELLED")}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setShowCancelConfirm(false)}
            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
          >
            Keep Job
          </button>
        </div>
      )}

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
