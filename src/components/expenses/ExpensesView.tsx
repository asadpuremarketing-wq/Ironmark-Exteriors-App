"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS } from "@/lib/expenses";
import type { Expense, ExpenseCategory } from "@prisma/client";

type ExpenseRow = Omit<Expense, "amountBeforeTax" | "taxPaid" | "total"> & {
  amountBeforeTax: number;
  taxPaid: number;
  total: number;
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(value: number) {
  return value.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default function ExpensesView({ expenses }: { expenses: ExpenseRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((e) => {
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (startDate && new Date(e.date).toISOString().slice(0, 10) < startDate) return false;
      if (endDate && new Date(e.date).toISOString().slice(0, 10) > endDate) return false;
      if (q) {
        const haystack = [e.vendor ?? "", e.description ?? "", e.notes ?? "", CATEGORY_LABELS[e.category]]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, query, categoryFilter, startDate, endDate]);

  const total = useMemo(() => filtered.reduce((sum, e) => sum + e.total, 0), [filtered]);

  async function handleArchive(id: string) {
    if (!confirm("Archive this expense? It will be hidden from the default list.")) return;
    setArchivingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to archive expense.");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setArchivingId(null);
    }
  }

  const selectClasses =
    "rounded-lg border border-ink-900/15 px-3 py-2 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";

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
            placeholder="Search by vendor, description, or notes..."
            className="w-full rounded-lg border border-ink-900/15 py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClasses}>
            <option value="">All Categories</option>
            {(Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={selectClasses}
            aria-label="Start date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={selectClasses}
            aria-label="End date"
          />

          {(query || categoryFilter || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategoryFilter("");
                setStartDate("");
                setEndDate("");
              }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-electric hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <span className="text-xs font-medium text-ink-900/40">
          {filtered.length} of {expenses.length} expense{expenses.length === 1 ? "" : "s"} · Total {formatMoney(total)}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white py-16 text-center text-sm text-ink-900/50">
          {expenses.length === 0 ? "No expenses yet." : "No expenses match your filters."}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/10 bg-ink-950/[0.02] text-left text-xs font-bold uppercase tracking-wide text-ink-900/50">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Tax</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-ink-900/5 transition last:border-b-0 hover:bg-brand-electric/[0.03]"
                  >
                    <td className="px-4 py-3 text-ink-900/60">{formatDate(e.date)}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{e.vendor ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-900/70">{CATEGORY_LABELS[e.category]}</td>
                    <td className="px-4 py-3 text-ink-900/70">{e.description ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-900/70">{formatMoney(e.amountBeforeTax)}</td>
                    <td className="px-4 py-3 text-ink-900/70">{formatMoney(e.taxPaid)}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{formatMoney(e.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        {e.receiptUrl && (
                          <a
                            href={e.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-ink-900/60 hover:text-brand-electric hover:underline"
                          >
                            Receipt
                          </a>
                        )}
                        <Link href={`/expenses/${e.id}/edit`} className="text-sm font-semibold text-brand-electric hover:underline">
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={archivingId === e.id}
                          onClick={() => handleArchive(e.id)}
                          className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((e) => (
              <div key={e.id} className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink-900">{e.vendor ?? CATEGORY_LABELS[e.category]}</div>
                    <div className="text-xs text-ink-900/50">{CATEGORY_LABELS[e.category]}</div>
                  </div>
                  <div className="font-semibold text-ink-900">{formatMoney(e.total)}</div>
                </div>
                <dl className="mt-3 flex flex-col gap-1 text-sm text-ink-900/70">
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Date:</dt>
                    <dd>{formatDate(e.date)}</dd>
                  </div>
                  {e.description && (
                    <div className="flex gap-1.5">
                      <dt className="text-ink-900/40">Description:</dt>
                      <dd>{e.description}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-3 flex gap-4">
                  {e.receiptUrl && (
                    <a
                      href={e.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-ink-900/60 hover:text-brand-electric hover:underline"
                    >
                      Receipt
                    </a>
                  )}
                  <Link href={`/expenses/${e.id}/edit`} className="text-sm font-semibold text-brand-electric hover:underline">
                    Edit
                  </Link>
                  <button
                    type="button"
                    disabled={archivingId === e.id}
                    onClick={() => handleArchive(e.id)}
                    className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
