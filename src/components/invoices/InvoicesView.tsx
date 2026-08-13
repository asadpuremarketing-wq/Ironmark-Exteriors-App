"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES, INVOICE_STATUSES } from "@/lib/invoices";
import type { InvoiceStatus } from "@prisma/client";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string | Date;
  dueDate: string | Date | null;
  description: string;
  total: number;
  status: InvoiceStatus;
  customer: { firstName: string; lastName: string; phone: string | null };
  payments: { amount: number }[];
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(value: number) {
  return value.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default function InvoicesView({ invoices }: { invoices: InvoiceRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter && inv.status !== statusFilter) return false;
      if (q) {
        const haystack = [
          inv.invoiceNumber,
          inv.description,
          inv.customer.firstName,
          inv.customer.lastName,
          inv.customer.phone,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, query, statusFilter]);

  function remainingFor(inv: InvoiceRow) {
    const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, inv.total - paid);
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3">
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-900/30"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M17 17l-4-4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by invoice #, description, or customer..."
            className="w-full rounded-lg border border-ink-900/15 py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10"
          />
        </div>

        <div className="flex flex-wrap gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              statusFilter === ""
                ? "bg-brand-electric text-white"
                : "bg-ink-900/5 text-ink-900/60 hover:bg-ink-900/10"
            }`}
          >
            All
          </button>
          {INVOICE_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                statusFilter === s
                  ? "bg-brand-electric text-white"
                  : "bg-ink-900/5 text-ink-900/60 hover:bg-ink-900/10"
              }`}
            >
              {INVOICE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <span className="text-xs font-medium text-ink-900/40">
          {filtered.length} of {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white py-16 text-center text-sm text-ink-900/50">
          {invoices.length === 0 ? "No invoices yet." : "No invoices match your filters."}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/10 bg-ink-950/[0.02] text-left text-xs font-bold uppercase tracking-wide text-ink-900/50">
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                    className="cursor-pointer border-b border-ink-900/5 transition last:border-b-0 hover:bg-brand-electric/[0.03]"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-ink-900/70">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">
                      {inv.customer.firstName} {inv.customer.lastName}
                    </td>
                    <td className="px-4 py-3 text-ink-900/60">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-4 py-3 text-ink-900/60">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{formatMoney(inv.total)}</td>
                    <td className="px-4 py-3 text-ink-900/70">{formatMoney(remainingFor(inv))}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${INVOICE_STATUS_STYLES[inv.status]}`}
                      >
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="block rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-xs text-ink-900/50">{inv.invoiceNumber}</div>
                    <div className="mt-0.5 font-semibold text-ink-900">
                      {inv.customer.firstName} {inv.customer.lastName}
                    </div>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${INVOICE_STATUS_STYLES[inv.status]}`}
                  >
                    {INVOICE_STATUS_LABELS[inv.status]}
                  </span>
                </div>
                <dl className="mt-3 flex flex-col gap-1 text-sm text-ink-900/70">
                  <div className="flex justify-between">
                    <dt className="text-ink-900/40">Date</dt>
                    <dd>{formatDate(inv.invoiceDate)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-900/40">Total</dt>
                    <dd className="font-semibold text-ink-900">{formatMoney(inv.total)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-900/40">Balance</dt>
                    <dd>{formatMoney(remainingFor(inv))}</dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
