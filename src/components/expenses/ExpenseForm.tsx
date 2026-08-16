"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/expenses";
import type { ExpenseCategory, PaymentMethod } from "@prisma/client";

type ExpenseFormValues = {
  id?: string;
  date: string;
  vendor: string;
  category: ExpenseCategory;
  description: string;
  amountBeforeTax: string;
  taxPaid: string;
  paymentMethod: PaymentMethod | "";
  receiptUrl: string;
  notes: string;
};

type Props = {
  mode: "create" | "edit";
  initialValues?: Partial<ExpenseFormValues>;
};

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const emptyValues: ExpenseFormValues = {
  date: todayKey(),
  vendor: "",
  category: "OTHER",
  description: "",
  amountBeforeTax: "",
  taxPaid: "",
  paymentMethod: "",
  receiptUrl: "",
  notes: "",
};

const inputClasses =
  "rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";

export default function ExpenseForm({ mode, initialValues }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<ExpenseFormValues>({ ...emptyValues, ...initialValues });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleReceiptSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/expenses/upload",
      });
      update("receiptUrl", blob.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload receipt.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!values.date) {
      setError("Please choose a date.");
      return;
    }
    if (!values.amountBeforeTax) {
      setError("Please enter an amount.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      date: values.date,
      vendor: values.vendor,
      category: values.category,
      description: values.description,
      amountBeforeTax: values.amountBeforeTax,
      taxPaid: values.taxPaid,
      paymentMethod: values.paymentMethod,
      receiptUrl: values.receiptUrl,
      notes: values.notes,
    };

    try {
      const url = mode === "create" ? "/api/expenses" : `/api/expenses/${initialValues?.id}`;
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

      router.push("/expenses");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Date</label>
          <input
            type="date"
            required
            value={values.date}
            onChange={(e) => update("date", e.target.value)}
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Category</label>
          <select
            value={values.category}
            onChange={(e) => update("category", e.target.value as ExpenseCategory)}
            className={inputClasses}
          >
            {(Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">
          Vendor <span className="font-normal text-ink-900/40">(optional)</span>
        </label>
        <input value={values.vendor} onChange={(e) => update("vendor", e.target.value)} className={inputClasses} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">
          Description <span className="font-normal text-ink-900/40">(optional)</span>
        </label>
        <input
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Amount Before Tax</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-900/40">
              $
            </span>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={values.amountBeforeTax}
              onChange={(e) => update("amountBeforeTax", e.target.value)}
              className={`${inputClasses} w-full pl-7`}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">
            Tax Paid <span className="font-normal text-ink-900/40">(optional)</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-900/40">
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.taxPaid}
              onChange={(e) => update("taxPaid", e.target.value)}
              className={`${inputClasses} w-full pl-7`}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">
          Payment Method <span className="font-normal text-ink-900/40">(optional)</span>
        </label>
        <select
          value={values.paymentMethod}
          onChange={(e) => update("paymentMethod", e.target.value as PaymentMethod | "")}
          className={inputClasses}
        >
          <option value="">Not specified</option>
          {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">
          Receipt Photo <span className="font-normal text-ink-900/40">(optional)</span>
        </label>

        {values.receiptUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-ink-900/15 p-3">
            {/\.(pdf)(\?|$)/i.test(values.receiptUrl) ? (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-ink-950/5 text-xs font-bold text-ink-900/50">
                PDF
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- externally hosted Blob URL, not a local/optimizable asset
              <img
                src={values.receiptUrl}
                alt="Receipt"
                className="h-16 w-16 shrink-0 rounded-md border border-ink-900/10 object-cover"
              />
            )}
            <div className="flex flex-1 flex-col gap-1">
              <a
                href={values.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-brand-electric hover:underline"
              >
                View full receipt
              </a>
              <button
                type="button"
                onClick={() => update("receiptUrl", "")}
                className="w-fit text-xs font-semibold text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="flex min-h-[44px] w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink-900/20 px-4 py-2.5 text-sm font-semibold text-ink-900/70 transition hover:border-brand-electric hover:text-brand-electric">
            {uploading ? "Uploading..." : "Take Photo / Upload Receipt"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              capture="environment"
              onChange={handleReceiptSelect}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
        {uploadError && <p className="text-sm font-medium text-red-600">{uploadError}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Notes</label>
        <textarea rows={4} value={values.notes} onChange={(e) => update("notes", e.target.value)} className={inputClasses} />
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-electric px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light disabled:pointer-events-none disabled:opacity-60"
        >
          {submitting ? "Saving..." : mode === "create" ? "Save Expense" : "Save Changes"}
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
