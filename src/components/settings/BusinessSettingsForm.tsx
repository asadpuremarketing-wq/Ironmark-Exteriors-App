"use client";

import { useState, type FormEvent } from "react";
import { PROVINCES } from "@/lib/customers";
import type { BusinessSettings } from "@prisma/client";

type Status = "idle" | "submitting" | "success" | "error";

type Values = {
  businessName: string;
  logoUrl: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  taxNumber: string;
  defaultTaxLabel: string;
  defaultTaxRate: string;
  invoiceFooterMessage: string;
};

type SettingsWithNumericRate = Omit<BusinessSettings, "defaultTaxRate"> & {
  defaultTaxRate: number;
};

function toValues(settings: SettingsWithNumericRate): Values {
  return {
    businessName: settings.businessName,
    logoUrl: settings.logoUrl ?? "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    website: settings.website ?? "",
    address: settings.address ?? "",
    city: settings.city ?? "",
    province: settings.province ?? "Ontario",
    postalCode: settings.postalCode ?? "",
    taxNumber: settings.taxNumber ?? "",
    defaultTaxLabel: settings.defaultTaxLabel,
    defaultTaxRate: String(settings.defaultTaxRate),
    invoiceFooterMessage: settings.invoiceFooterMessage ?? "",
  };
}

const inputClasses =
  "rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";

export default function BusinessSettingsForm({
  settings,
  readOnly,
}: {
  settings: SettingsWithNumericRate;
  readOnly: boolean;
}) {
  const [values, setValues] = useState<Values>(toValues(settings));
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/settings/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Something went wrong.");
      }

      setValues(toValues(body.settings));
      setStatus("success");
      setMessage("Business settings updated.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (readOnly) {
    return (
      <dl className="flex flex-col gap-4">
        {[
          ["Business Name", values.businessName],
          ["Phone", values.phone || "—"],
          ["Email", values.email || "—"],
          ["Website", values.website || "—"],
          ["Address", [values.address, values.city, values.province, values.postalCode].filter(Boolean).join(", ") || "—"],
          ["Default Tax", `${values.defaultTaxLabel} (${values.defaultTaxRate}%)`],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-900/40">{label}</dt>
            <dd className="mt-0.5 text-sm text-ink-900">{value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Business Name</label>
        <input
          value={values.businessName}
          onChange={(e) => update("businessName", e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Phone</label>
          <input value={values.phone} onChange={(e) => update("phone", e.target.value)} className={inputClasses} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Email</label>
          <input value={values.email} onChange={(e) => update("email", e.target.value)} className={inputClasses} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Website</label>
        <input value={values.website} onChange={(e) => update("website", e.target.value)} className={inputClasses} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Street Address</label>
        <input value={values.address} onChange={(e) => update("address", e.target.value)} className={inputClasses} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">City</label>
          <input value={values.city} onChange={(e) => update("city", e.target.value)} className={inputClasses} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Province</label>
          <select value={values.province} onChange={(e) => update("province", e.target.value)} className={inputClasses}>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Postal Code</label>
          <input
            value={values.postalCode}
            onChange={(e) => update("postalCode", e.target.value)}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Tax Number (optional)</label>
        <input value={values.taxNumber} onChange={(e) => update("taxNumber", e.target.value)} className={inputClasses} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Default Tax Label</label>
          <input
            value={values.defaultTaxLabel}
            onChange={(e) => update("defaultTaxLabel", e.target.value)}
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Default Tax Rate (%)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.defaultTaxRate}
            onChange={(e) => update("defaultTaxRate", e.target.value)}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Invoice Footer Message (optional)</label>
        <textarea
          rows={3}
          value={values.invoiceFooterMessage}
          onChange={(e) => update("invoiceFooterMessage", e.target.value)}
          className={inputClasses}
        />
      </div>

      {message && (
        <p className={`text-sm font-medium ${status === "success" ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-1 w-fit rounded-lg bg-brand-electric px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light disabled:pointer-events-none disabled:opacity-60"
      >
        {status === "submitting" ? "Saving..." : "Save Business Settings"}
      </button>
    </form>
  );
}
