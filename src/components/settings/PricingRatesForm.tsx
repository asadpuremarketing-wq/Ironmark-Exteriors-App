"use client";

import { useState } from "react";
import type { PricingRateDTO } from "@/lib/pricing";

export default function PricingRatesForm({
  rates: initialRates,
  readOnly,
}: {
  rates: PricingRateDTO[];
  readOnly: boolean;
}) {
  const [rates, setRates] = useState(initialRates);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(id: string, field: "ratePerUnit" | "flatFee" | "minimumPrice" | "unitLabel", value: number | string) {
    setRates((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/pricing-rates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rates: rates.map((r) => ({
            id: r.id,
            ratePerUnit: r.ratePerUnit,
            flatFee: r.flatFee,
            minimumPrice: r.minimumPrice,
            unitLabel: r.unitLabel,
          })),
        }),
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

  if (rates.length === 0) {
    return <p className="text-sm text-ink-900/40">No pricing rates configured yet.</p>;
  }

  const inputClasses =
    "w-full rounded-lg border border-ink-900/15 px-2.5 py-1.5 text-sm text-ink-900 disabled:bg-ink-900/5";

  return (
    <div>
      <p className="mb-4 text-xs text-ink-900/50">
        Set your real rate per unit for each service. The Estimator computes: quantity × rate + flat fee, with a
        floor at your minimum job price. Leave a rate at $0 to hide that service from estimate suggestions until
        you set it.
      </p>
      <div className="flex flex-col gap-4">
        {rates.map((rate) => (
          <div key={rate.id} className="rounded-xl border border-ink-900/10 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-ink-900">{rate.service}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-ink-900/40">per</span>
                <input
                  value={rate.unitLabel}
                  disabled={readOnly}
                  onChange={(e) => update(rate.id, "unitLabel", e.target.value)}
                  className="w-36 rounded-lg border border-ink-900/15 px-2 py-1 text-xs text-ink-900 disabled:bg-ink-900/5"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-900/40">
                  Rate / Unit
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-900/40">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={readOnly}
                    value={rate.ratePerUnit}
                    onChange={(e) => update(rate.id, "ratePerUnit", Number(e.target.value))}
                    className={`${inputClasses} pl-5`}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-900/40">
                  Flat Fee <span className="font-normal normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-900/40">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={readOnly}
                    value={rate.flatFee}
                    onChange={(e) => update(rate.id, "flatFee", Number(e.target.value))}
                    className={`${inputClasses} pl-5`}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-900/40">
                  Minimum Job
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-900/40">$</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={readOnly}
                    value={rate.minimumPrice}
                    onChange={(e) => update(rate.id, "minimumPrice", Number(e.target.value))}
                    className={`${inputClasses} pl-5`}
                  />
                </div>
              </div>
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
            {saving ? "Saving…" : "Save Pricing Rates"}
          </button>
          {saved && <span className="text-xs font-semibold text-green-700">Saved.</span>}
          {error && <span className="text-xs font-semibold text-red-700">{error}</span>}
        </div>
      )}
    </div>
  );
}
