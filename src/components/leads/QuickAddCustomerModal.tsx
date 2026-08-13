"use client";

import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { PROVINCES } from "@/lib/customers";
import { LEAD_SOURCES } from "@/lib/leads";
import { formatPhoneInput } from "@/lib/phone";
import type { Customer } from "@prisma/client";

type DuplicateMatch = { id: string; name: string; phone: string; email: string | null };

type Props = {
  onClose: () => void;
  onCreated: (customer: Customer) => void;
};

const inputClasses =
  "rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";

export default function QuickAddCustomerModal({ onClose, onCreated }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("Ontario");
  const [postalCode, setPostalCode] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);

  async function submit(force: boolean) {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email,
          streetAddress,
          city,
          province,
          postalCode,
          notes: leadSource ? `Source: ${leadSource}` : undefined,
          force,
        }),
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

      onCreated(body.customer);
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">Quick Add Customer</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-900/50 hover:bg-ink-900/5"
          >
            ✕
          </button>
        </div>

        {duplicates && duplicates.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-bold text-amber-900">Possible existing customer found.</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {duplicates.map((d) => (
                <li key={d.id} className="text-xs text-amber-900">
                  <Link href={`/customers/${d.id}`} target="_blank" className="font-semibold underline">
                    {d.name}
                  </Link>{" "}
                  — {d.phone}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={submitting}
              className="mt-2 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              Create Anyway
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink-900">First Name</label>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink-900">Last Name</label>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink-900">Phone</label>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink-900">
              Street Address <span className="font-normal text-ink-900/40">(optional)</span>
            </label>
            <input
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink-900">
                City <span className="font-normal text-ink-900/40">(optional)</span>
              </label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClasses} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink-900">Province</label>
              <select value={province} onChange={(e) => setProvince(e.target.value)} className={inputClasses}>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink-900">
                Postal Code <span className="font-normal text-ink-900/40">(optional)</span>
              </label>
              <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputClasses} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-ink-900">
                How did they find us? <span className="font-normal text-ink-900/40">(optional)</span>
              </label>
              <select value={leadSource} onChange={(e) => setLeadSource(e.target.value)} className={inputClasses}>
                <option value="">—</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <div className="mt-2 flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-electric px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create Customer"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-ink-900/15 px-5 py-2.5 text-sm font-bold text-ink-900 hover:border-ink-900/30"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
