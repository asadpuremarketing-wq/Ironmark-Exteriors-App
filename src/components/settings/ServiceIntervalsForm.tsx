"use client";

import { useState } from "react";

type Interval = { id: string; service: string; months: number };

export default function ServiceIntervalsForm({
  intervals: initialIntervals,
  readOnly,
}: {
  intervals: Interval[];
  readOnly: boolean;
}) {
  const [intervals, setIntervals] = useState(initialIntervals);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(id: string, months: number) {
    setIntervals((prev) => prev.map((i) => (i.id === id ? { ...i, months } : i)));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/service-intervals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intervals: intervals.map((i) => ({ id: i.id, months: i.months })) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save.");
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (intervals.length === 0) {
    return <p className="text-sm text-ink-900/40">No service reminder intervals configured yet.</p>;
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        {intervals.map((interval) => (
          <div key={interval.id} className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink-900">{interval.service}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={60}
                disabled={readOnly}
                value={interval.months}
                onChange={(e) => update(interval.id, Number(e.target.value))}
                className="w-20 rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-900 disabled:bg-ink-900/5"
              />
              <span className="text-xs text-ink-900/40">months</span>
            </div>
          </div>
        ))}
      </div>
      {!readOnly && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-electric px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-electric-light disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Intervals"}
          </button>
          {saved && <span className="text-xs font-semibold text-green-700">Saved.</span>}
          {error && <span className="text-xs font-semibold text-red-700">{error}</span>}
        </div>
      )}
    </div>
  );
}
