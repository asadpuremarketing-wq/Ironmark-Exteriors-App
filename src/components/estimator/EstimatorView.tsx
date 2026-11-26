"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PricingRateDTO } from "@/lib/pricing";
import { estimateJobValue } from "@/lib/pricing";

function formatMoney(value: number) {
  return value.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default function EstimatorView({ rates }: { rates: PricingRateDTO[] }) {
  const configuredRates = rates.filter((r) => r.ratePerUnit > 0 || r.flatFee > 0 || r.minimumPrice > 0);
  const [serviceId, setServiceId] = useState(configuredRates[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");

  const rate = rates.find((r) => r.id === serviceId);
  const quantityNum = Number(quantity);
  const hasValidQuantity = quantity.trim() !== "" && Number.isFinite(quantityNum) && quantityNum >= 0;

  const result = useMemo(() => {
    if (!rate || !hasValidQuantity) return null;
    return estimateJobValue(quantityNum, rate);
  }, [rate, hasValidQuantity, quantityNum]);

  if (configuredRates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink-900/15 bg-ink-950/[0.02] p-6 text-center">
        <p className="text-sm font-semibold text-ink-900">No pricing rates set up yet</p>
        <p className="mt-1 text-sm text-ink-900/50">
          Go to{" "}
          <Link href="/settings" className="font-semibold text-brand-electric hover:underline">
            Settings
          </Link>{" "}
          and enter your rate per unit for at least one service before the Estimator can suggest a quote.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Service</label>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-electric"
        >
          {configuredRates.map((r) => (
            <option key={r.id} value={r.id}>
              {r.service}
            </option>
          ))}
        </select>
      </div>

      {rate && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">
            Quantity <span className="font-normal text-ink-900/40">({rate.unitLabel})</span>
          </label>
          <input
            type="number"
            min={0}
            step="0.1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={`e.g. 120 ${rate.unitLabel}s`}
            className="rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-electric"
          />
        </div>
      )}

      {result && rate && (
        <div className="rounded-xl border border-brand-electric/25 bg-brand-electric/5 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-electric">Suggested Quote</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-ink-900">{formatMoney(result.estimate)}</p>
          <div className="mt-3 flex flex-col gap-1 text-xs text-ink-900/60">
            <span>
              {quantityNum} {rate.unitLabel}
              {quantityNum === 1 ? "" : "s"} × {formatMoney(rate.ratePerUnit)}
              {rate.flatFee > 0 ? ` + ${formatMoney(rate.flatFee)} flat fee` : ""} = {formatMoney(result.raw)}
            </span>
            {result.hitMinimum && (
              <span className="font-semibold text-amber-700">
                Raised to your {formatMoney(rate.minimumPrice)} minimum job price.
              </span>
            )}
          </div>
          <Link
            href={`/jobs/new?service=${encodeURIComponent(rate.service)}&quotedPrice=${result.estimate.toFixed(2)}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-electric px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light"
          >
            Create Job With This Quote
          </Link>
        </div>
      )}

      <p className="text-xs text-ink-900/40">
        This is a starting point based on your own rates — adjust for site conditions, access, material cost
        changes, or anything else before sending the final quote.
      </p>
    </div>
  );
}
