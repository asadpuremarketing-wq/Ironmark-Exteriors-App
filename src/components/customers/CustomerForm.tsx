"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PROVINCES, STATUS_LABELS } from "@/lib/customers";
import { formatPhoneInput } from "@/lib/phone";
import type { CustomerStatus } from "@prisma/client";

type CustomerFormValues = {
  id?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
  status: CustomerStatus;
  emailMarketingConsent: boolean;
  smsMarketingConsent: boolean;
  doNotContact: boolean;
};

type DuplicateMatch = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

type Props = {
  mode: "create" | "edit";
  initialValues?: Partial<CustomerFormValues>;
};

const emptyValues: CustomerFormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  streetAddress: "",
  city: "",
  province: "Ontario",
  postalCode: "",
  notes: "",
  status: "LEAD",
  emailMarketingConsent: false,
  smsMarketingConsent: false,
  doNotContact: false,
};

const inputClasses =
  "rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";

export default function CustomerForm({ mode, initialValues }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<CustomerFormValues>({
    ...emptyValues,
    ...initialValues,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);

  function update<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function submit(force: boolean) {
    setSubmitting(true);
    setError("");

    const payload = { ...values, force };

    try {
      const url = mode === "create" ? "/api/customers" : `/api/customers/${initialValues?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 409 && body.duplicate) {
        setDuplicates(body.matches);
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        throw new Error(body.error || "Something went wrong.");
      }

      const customerId = body.customer.id;
      router.push(`/customers/${customerId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setDuplicates(null);
    submit(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {duplicates && duplicates.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">Possible existing customer found.</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {duplicates.map((d) => (
              <li key={d.id} className="text-sm text-amber-900">
                <Link href={`/customers/${d.id}`} className="font-semibold underline">
                  {d.name}
                </Link>{" "}
                — {d.phone}
                {d.email ? ` · ${d.email}` : ""}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={submitting}
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              Create Anyway
            </button>
            <button
              type="button"
              onClick={() => setDuplicates(null)}
              className="rounded-lg border border-amber-300 px-4 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900/50">
            Contact Information
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink-900">First Name</label>
              <input
                required
                value={values.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink-900">Last Name</label>
              <input
                required
                value={values.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink-900">
              Phone <span className="font-normal text-ink-900/40">(required)</span>
            </label>
            <input
              required
              type="tel"
              value={values.phone}
              onChange={(e) => update("phone", formatPhoneInput(e.target.value))}
              placeholder="+1 647-951-2786"
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink-900">
              Email <span className="font-normal text-ink-900/40">(optional)</span>
            </label>
            <input
              type="email"
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputClasses}
            />
          </div>

          {mode === "edit" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink-900">Status</label>
              <select
                value={values.status}
                onChange={(e) => update("status", e.target.value as CustomerStatus)}
                className={inputClasses}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900/50">
            Property Information{" "}
            <span className="font-normal normal-case text-ink-900/40">(optional)</span>
          </h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink-900">Street Address</label>
            <input
              value={values.streetAddress}
              onChange={(e) => update("streetAddress", e.target.value)}
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink-900">City</label>
              <input
                value={values.city}
                onChange={(e) => update("city", e.target.value)}
                className={inputClasses}
              />
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
        </section>
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

      {mode === "edit" && (
        <section className="flex flex-col gap-3 rounded-xl border border-ink-900/10 bg-ink-950/[0.02] p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900/50">
            Marketing &amp; Contact Preferences
          </h2>
          <label className="flex items-center gap-2 text-sm text-ink-900">
            <input
              type="checkbox"
              checked={values.emailMarketingConsent}
              onChange={(e) => update("emailMarketingConsent", e.target.checked)}
              className="h-4 w-4 rounded border-ink-900/30"
            />
            Email marketing consent
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-900">
            <input
              type="checkbox"
              checked={values.smsMarketingConsent}
              onChange={(e) => update("smsMarketingConsent", e.target.checked)}
              className="h-4 w-4 rounded border-ink-900/30"
            />
            SMS marketing consent
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-900">
            <input
              type="checkbox"
              checked={values.doNotContact}
              onChange={(e) => update("doNotContact", e.target.checked)}
              className="h-4 w-4 rounded border-ink-900/30"
            />
            Do not contact
          </label>
        </section>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-electric px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light disabled:pointer-events-none disabled:opacity-60"
        >
          {submitting ? "Saving..." : mode === "create" ? "Save Customer" : "Save Changes"}
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
