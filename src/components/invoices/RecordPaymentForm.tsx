"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_METHOD_LABELS } from "@/lib/expenses";
import type { PaymentMethod } from "@prisma/client";

type Props = {
  invoiceId: string;
  remaining: number;
  onClose: () => void;
};

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const inputClasses =
  "rounded-lg border border-ink-900/15 px-3.5 py-3 text-base outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";

function formatMoney(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default function RecordPaymentForm({ invoiceId, remaining, onClose }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState(remaining > 0 ? remaining.toFixed(2) : "");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [paymentDate, setPaymentDate] = useState(todayKey());
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [overLimitConfirm, setOverLimitConfirm] = useState(false);

  async function handleSubmit(e: FormEvent, overrideLimit = false) {
    e.preventDefault();

    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          method,
          paymentDate,
          referenceNumber,
          notes,
          overrideLimit,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 409 && body.requiresOverride) {
        setOverLimitConfirm(true);
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        throw new Error(body.error || "Something went wrong.");
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col gap-4">
      <p className="text-sm text-ink-900/60">Remaining balance: {formatMoney(remaining)}</p>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Amount</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-900/40">
            $
          </span>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setOverLimitConfirm(false);
            }}
            className={`${inputClasses} w-full pl-7`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          className={inputClasses}
        >
          {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Payment Date</label>
        <input
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">
          Reference # <span className="font-normal text-ink-900/40">(optional)</span>
        </label>
        <input
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">
          Notes <span className="font-normal text-ink-900/40">(optional)</span>
        </label>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClasses} />
      </div>

      {overLimitConfirm && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">
            This payment exceeds the remaining balance of {formatMoney(remaining)}.
          </p>
          <button
            type="button"
            disabled={submitting}
            onClick={(e) => handleSubmit(e, true)}
            className="mt-2 text-sm font-semibold text-amber-900 underline disabled:opacity-50"
          >
            Record it anyway
          </button>
        </div>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-[44px] flex-1 rounded-lg bg-brand-electric px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-electric-light disabled:pointer-events-none disabled:opacity-60"
        >
          {submitting ? "Recording..." : "Record Payment"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-lg border border-ink-900/15 px-6 py-3 text-sm font-bold text-ink-900 transition hover:border-ink-900/30"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
