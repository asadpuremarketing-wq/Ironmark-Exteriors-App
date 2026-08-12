"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LEAD_SOURCES, SERVICES, STATUS_LABELS } from "@/lib/leads";
import CustomerPicker from "./CustomerPicker";
import type { LeadStatus } from "@prisma/client";

type LeadFormValues = {
  id?: string;
  customerId: string;
  customerLabel: string;
  serviceRequested: string;
  leadSource: string;
  estimatedValue: string;
  status: LeadStatus;
  dateReceived: string;
  followUpDate: string;
  notes: string;
};

type Props = {
  mode: "create" | "edit";
  initialValues?: Partial<LeadFormValues>;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

const emptyValues: LeadFormValues = {
  customerId: "",
  customerLabel: "",
  serviceRequested: SERVICES[0],
  leadSource: LEAD_SOURCES[0],
  estimatedValue: "",
  status: "NEW",
  dateReceived: today(),
  followUpDate: "",
  notes: "",
};

const inputClasses =
  "rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";

export default function LeadForm({ mode, initialValues }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<LeadFormValues>({ ...emptyValues, ...initialValues });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof LeadFormValues>(key: K, value: LeadFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!values.customerId) {
      setError("Please select or create a customer.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      customerId: values.customerId,
      serviceRequested: values.serviceRequested,
      leadSource: values.leadSource,
      estimatedValue: values.estimatedValue,
      status: values.status,
      dateReceived: values.dateReceived,
      followUpDate: values.followUpDate || null,
      notes: values.notes,
    };

    try {
      const url = mode === "create" ? "/api/leads" : `/api/leads/${initialValues?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Something went wrong.");
      }

      router.push(`/leads/${body.lead.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {mode === "create" ? (
        <CustomerPicker
          value={values.customerId}
          valueLabel={values.customerLabel}
          onChange={(id, label) => {
            update("customerId", id);
            update("customerLabel", label);
          }}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink-900">Customer</span>
          <div className="rounded-lg border border-ink-900/10 bg-ink-950/[0.02] px-3.5 py-2.5 text-sm text-ink-900/70">
            {values.customerLabel}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Service Requested</label>
          <select
            value={values.serviceRequested}
            onChange={(e) => update("serviceRequested", e.target.value)}
            className={inputClasses}
          >
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Lead Source</label>
          <select
            value={values.leadSource}
            onChange={(e) => update("leadSource", e.target.value)}
            className={inputClasses}
          >
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">
            Estimated Value <span className="font-normal text-ink-900/40">(optional)</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-900/40">
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.estimatedValue}
              onChange={(e) => update("estimatedValue", e.target.value)}
              className={`${inputClasses} w-full pl-7`}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Status</label>
          <select
            value={values.status}
            onChange={(e) => update("status", e.target.value as LeadStatus)}
            className={inputClasses}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Date Received</label>
          <input
            type="date"
            value={values.dateReceived}
            onChange={(e) => update("dateReceived", e.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">
            Follow-Up Date <span className="font-normal text-ink-900/40">(optional)</span>
          </label>
          <input
            type="date"
            value={values.followUpDate}
            onChange={(e) => update("followUpDate", e.target.value)}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Notes</label>
        <textarea
          rows={4}
          value={values.notes}
          onChange={(e) => update("notes", e.target.value)}
          className={inputClasses}
        />
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-electric px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light disabled:pointer-events-none disabled:opacity-60"
        >
          {submitting ? "Saving..." : mode === "create" ? "Save Lead" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-ink-900/15 px-6 py-2.5 text-sm font-bold text-ink-900 transition hover:border-ink-900/30"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
