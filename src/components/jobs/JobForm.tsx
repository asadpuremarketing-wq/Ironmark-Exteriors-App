"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SERVICES } from "@/lib/leads";
import { PROVINCES } from "@/lib/customers";
import { STATUS_LABELS } from "@/lib/jobs";
import CustomerPicker from "@/components/leads/CustomerPicker";
import type { Customer, JobStatus } from "@prisma/client";

type JobFormValues = {
  id?: string;
  customerId: string;
  customerLabel: string;
  leadId?: string;
  service: string;
  serviceAddress: string;
  city: string;
  province: string;
  postalCode: string;
  scheduledDate: string;
  startTime: string;
  estimatedDuration: string;
  quotedPrice: string;
  finalPrice: string;
  status: JobStatus;
  notes: string;
};

type Props = {
  mode: "create" | "edit";
  initialValues?: Partial<JobFormValues>;
  lockCustomer?: boolean;
};

const emptyValues: JobFormValues = {
  customerId: "",
  customerLabel: "",
  service: SERVICES[0],
  serviceAddress: "",
  city: "",
  province: "Ontario",
  postalCode: "",
  scheduledDate: "",
  startTime: "",
  estimatedDuration: "",
  quotedPrice: "",
  finalPrice: "",
  status: "BOOKED",
  notes: "",
};

const inputClasses =
  "rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";

export default function JobForm({ mode, initialValues, lockCustomer }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<JobFormValues>({ ...emptyValues, ...initialValues });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [duplicateJobId, setDuplicateJobId] = useState<string | null>(null);

  function update<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSelectCustomer(customer: Customer) {
    // Auto-populate the service address from the customer's record, but
    // only if the address fields are still empty — never overwrite
    // something the user already typed.
    setValues((v) => ({
      ...v,
      serviceAddress: v.serviceAddress || customer.streetAddress || "",
      city: v.city || customer.city || "",
      province: v.city ? v.province : customer.province || v.province,
      postalCode: v.postalCode || customer.postalCode || "",
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!values.customerId) {
      setError("Please select or create a customer.");
      return;
    }
    if (!values.scheduledDate) {
      setError("Please choose a scheduled date.");
      return;
    }

    setSubmitting(true);
    setError("");
    setDuplicateJobId(null);

    const payload = {
      customerId: values.customerId,
      leadId: values.leadId,
      service: values.service,
      serviceAddress: values.serviceAddress,
      city: values.city,
      province: values.province,
      postalCode: values.postalCode,
      scheduledDate: values.scheduledDate,
      startTime: values.startTime,
      estimatedDuration: values.estimatedDuration,
      quotedPrice: values.quotedPrice,
      finalPrice: values.finalPrice,
      status: values.status,
      notes: values.notes,
    };

    try {
      const url = mode === "create" ? "/api/jobs" : `/api/jobs/${initialValues?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 409 && body.existingJobId) {
        setDuplicateJobId(body.existingJobId);
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        throw new Error(body.error || "Something went wrong.");
      }

      router.push(`/jobs/${body.job.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {duplicateJobId && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">
            This lead has already been converted into a job.
          </p>
          <Link
            href={`/jobs/${duplicateJobId}`}
            className="mt-2 inline-flex text-sm font-semibold text-amber-900 underline"
          >
            View the existing job
          </Link>
        </div>
      )}

      {lockCustomer ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink-900">Customer</span>
          <div className="rounded-lg border border-ink-900/10 bg-ink-950/[0.02] px-3.5 py-2.5 text-sm text-ink-900/70">
            {values.customerLabel}
          </div>
        </div>
      ) : (
        <CustomerPicker
          value={values.customerId}
          valueLabel={values.customerLabel}
          onChange={(id, label) => {
            update("customerId", id);
            update("customerLabel", label);
          }}
          onSelectCustomer={handleSelectCustomer}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Service</label>
          <select
            value={values.service}
            onChange={(e) => update("service", e.target.value)}
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
          <label className="text-sm font-semibold text-ink-900">Status</label>
          <select
            value={values.status}
            onChange={(e) => update("status", e.target.value as JobStatus)}
            className={inputClasses}
          >
            {Object.entries(STATUS_LABELS)
              .filter(([value]) => value !== "COMPLETED")
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">
          Service Address <span className="font-normal text-ink-900/40">(optional)</span>
        </label>
        <input
          value={values.serviceAddress}
          onChange={(e) => update("serviceAddress", e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">City</label>
          <input
            value={values.city}
            onChange={(e) => update("city", e.target.value)}
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Province</label>
          <select
            value={values.province}
            onChange={(e) => update("province", e.target.value)}
            className={inputClasses}
          >
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Scheduled Date</label>
          <input
            type="date"
            required
            value={values.scheduledDate}
            onChange={(e) => update("scheduledDate", e.target.value)}
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">
            Start Time <span className="font-normal text-ink-900/40">(optional)</span>
          </label>
          <input
            type="time"
            value={values.startTime}
            onChange={(e) => update("startTime", e.target.value)}
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">
            Est. Duration <span className="font-normal text-ink-900/40">(optional)</span>
          </label>
          <input
            placeholder="e.g. 2 hours"
            value={values.estimatedDuration}
            onChange={(e) => update("estimatedDuration", e.target.value)}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">
            Quoted Price <span className="font-normal text-ink-900/40">(optional)</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-900/40">
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.quotedPrice}
              onChange={(e) => update("quotedPrice", e.target.value)}
              className={`${inputClasses} w-full pl-7`}
            />
          </div>
        </div>

        {mode === "edit" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink-900">
              Final Price <span className="font-normal text-ink-900/40">(optional)</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-900/40">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values.finalPrice}
                onChange={(e) => update("finalPrice", e.target.value)}
                className={`${inputClasses} w-full pl-7`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Internal Notes</label>
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
          {submitting ? "Saving..." : mode === "create" ? "Save Job" : "Save Changes"}
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
