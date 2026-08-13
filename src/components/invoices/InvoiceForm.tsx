"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CustomerPicker from "@/components/leads/CustomerPicker";
import { computeInvoiceTotals } from "@/lib/invoices";

type InvoiceFormValues = {
  id?: string;
  customerId: string;
  customerLabel: string;
  jobId?: string;
  invoiceDate: string;
  dueDate: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxLabel: string;
  taxRate: string;
  notes: string;
};

type Props = {
  mode: "create" | "edit";
  initialValues?: Partial<InvoiceFormValues>;
  lockCustomer?: boolean;
};

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const emptyValues: InvoiceFormValues = {
  customerId: "",
  customerLabel: "",
  invoiceDate: todayKey(),
  dueDate: "",
  description: "",
  quantity: "1",
  unitPrice: "",
  discount: "0",
  taxLabel: "",
  taxRate: "",
  notes: "",
};

const inputClasses =
  "rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";

function formatMoney(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default function InvoiceForm({ mode, initialValues, lockCustomer }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<InvoiceFormValues>({ ...emptyValues, ...initialValues });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [duplicateInvoiceId, setDuplicateInvoiceId] = useState<string | null>(null);

  function update<K extends keyof InvoiceFormValues>(key: K, value: InvoiceFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const totals = useMemo(() => {
    const quantity = Number(values.quantity) || 0;
    const unitPrice = Number(values.unitPrice) || 0;
    const discount = Number(values.discount) || 0;
    const taxRate = Number(values.taxRate) || 0;
    return computeInvoiceTotals({ quantity, unitPrice, discount, taxRate });
  }, [values.quantity, values.unitPrice, values.discount, values.taxRate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!values.customerId) {
      setError("Please select or create a customer.");
      return;
    }
    if (!values.description.trim()) {
      setError("Please enter a description.");
      return;
    }
    if (!values.unitPrice) {
      setError("Please enter a unit price.");
      return;
    }

    setSubmitting(true);
    setError("");
    setDuplicateInvoiceId(null);

    const payload = {
      customerId: values.customerId,
      jobId: values.jobId,
      invoiceDate: values.invoiceDate,
      dueDate: values.dueDate,
      description: values.description,
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      discount: values.discount,
      taxLabel: values.taxLabel || undefined,
      taxRate: values.taxRate || undefined,
      notes: values.notes,
    };

    try {
      const url = mode === "create" ? "/api/invoices" : `/api/invoices/${initialValues?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 409 && body.existingInvoiceId) {
        setDuplicateInvoiceId(body.existingInvoiceId);
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        throw new Error(body.error || "Something went wrong.");
      }

      router.push(`/invoices/${body.invoice.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {duplicateInvoiceId && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">This job already has an invoice.</p>
          <Link
            href={`/invoices/${duplicateInvoiceId}`}
            className="mt-2 inline-flex text-sm font-semibold text-amber-900 underline"
          >
            View the existing invoice
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
        />
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">Description</label>
        <input
          required
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="e.g. Gutter Cleaning Service"
          className={inputClasses}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Invoice Date</label>
          <input
            type="date"
            value={values.invoiceDate}
            onChange={(e) => update("invoiceDate", e.target.value)}
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">
            Due Date <span className="font-normal text-ink-900/40">(optional)</span>
          </label>
          <input
            type="date"
            value={values.dueDate}
            onChange={(e) => update("dueDate", e.target.value)}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Quantity</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.quantity}
            onChange={(e) => update("quantity", e.target.value)}
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">Unit Price</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-900/40">
              $
            </span>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={values.unitPrice}
              onChange={(e) => update("unitPrice", e.target.value)}
              className={`${inputClasses} w-full pl-7`}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">
            Discount <span className="font-normal text-ink-900/40">(optional)</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-900/40">
              $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.discount}
              onChange={(e) => update("discount", e.target.value)}
              className={`${inputClasses} w-full pl-7`}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">
            Tax Label <span className="font-normal text-ink-900/40">(optional)</span>
          </label>
          <input
            placeholder="Uses business default"
            value={values.taxLabel}
            onChange={(e) => update("taxLabel", e.target.value)}
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-900">
            Tax Rate % <span className="font-normal text-ink-900/40">(optional)</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Uses business default"
            value={values.taxRate}
            onChange={(e) => update("taxRate", e.target.value)}
            className={inputClasses}
          />
        </div>
      </div>

      <div className="rounded-xl border border-ink-900/10 bg-ink-950/[0.02] p-4">
        <div className="flex justify-between text-sm text-ink-900/70">
          <span>Subtotal</span>
          <span>{formatMoney(totals.subtotal)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-ink-900/70">
          <span>Tax</span>
          <span>{formatMoney(totals.taxAmount)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-ink-900/10 pt-2 text-base font-bold text-ink-900">
          <span>Total</span>
          <span>{formatMoney(totals.total)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-900">
          Notes <span className="font-normal text-ink-900/40">(optional)</span>
        </label>
        <textarea rows={4} value={values.notes} onChange={(e) => update("notes", e.target.value)} className={inputClasses} />
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-electric px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light disabled:pointer-events-none disabled:opacity-60"
        >
          {submitting ? "Saving..." : mode === "create" ? "Save Invoice" : "Save Changes"}
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
