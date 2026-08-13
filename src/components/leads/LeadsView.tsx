"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { customerFullName } from "@/lib/customers";
import { LEAD_SOURCES, SERVICES, STATUS_LABELS, isOverdue, isDueToday } from "@/lib/leads";
import QuickStatusSelect from "./QuickStatusSelect";
import type { Customer, Lead } from "@prisma/client";

type LeadWithCustomer = Omit<Lead, "estimatedValue"> & {
  customer: Customer;
  estimatedValue: number | null;
};

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

export default function LeadsView({ leads }: { leads: LeadWithCustomer[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const followUpsDue = useMemo(
    () => leads.filter((l) => isOverdue(l.followUpDate) || isDueToday(l.followUpDate)),
    [leads]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (sourceFilter && l.leadSource !== sourceFilter) return false;
      if (serviceFilter && l.serviceRequested !== serviceFilter) return false;
      if (dateFilter) {
        const d = new Date(l.dateReceived).toISOString().slice(0, 10);
        if (d !== dateFilter) return false;
      }
      if (q) {
        const haystack = [
          customerFullName(l.customer),
          l.customer.phone,
          l.customer.city ?? "",
          l.serviceRequested,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [leads, query, statusFilter, sourceFilter, serviceFilter, dateFilter]);

  const selectClasses =
    "rounded-lg border border-ink-900/15 px-3 py-2 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";

  return (
    <div>
      {followUpsDue.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-800">
            Follow-Ups Due ({followUpsDue.length})
          </h2>
          <div className="flex flex-col gap-2">
            {followUpsDue.map((l) => {
              const overdue = isOverdue(l.followUpDate);
              return (
                <Link
                  key={l.id}
                  href={`/leads/${l.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-4 py-2.5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        overdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {overdue ? "Overdue" : "Due Today"}
                    </span>
                    <span className="text-sm font-semibold text-ink-900">
                      {customerFullName(l.customer)}
                    </span>
                    <span className="text-xs text-ink-900/50">{l.serviceRequested}</span>
                  </div>
                  <span className="text-xs font-medium text-ink-900/60">
                    Follow up: {formatDate(l.followUpDate)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

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
            placeholder="Search by customer name, phone, city, or service..."
            className="w-full rounded-lg border border-ink-900/15 py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClasses}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className={selectClasses}
          >
            <option value="">All Sources</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className={selectClasses}
          >
            <option value="">All Services</option>
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={selectClasses}
          />

          {(statusFilter || sourceFilter || serviceFilter || dateFilter || query) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusFilter("");
                setSourceFilter("");
                setServiceFilter("");
                setDateFilter("");
              }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-electric hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <span className="text-xs font-medium text-ink-900/40">
          {filtered.length} of {leads.length} lead{leads.length === 1 ? "" : "s"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white py-16 text-center text-sm text-ink-900/50">
          {leads.length === 0 ? "No leads yet." : "No leads match your filters."}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/10 bg-ink-950/[0.02] text-left text-xs font-bold uppercase tracking-wide text-ink-900/50">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Est. Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3">Follow-Up</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => router.push(`/leads/${l.id}`)}
                    className="cursor-pointer border-b border-ink-900/5 transition last:border-b-0 hover:bg-brand-electric/[0.03]"
                  >
                    <td className="px-4 py-3 font-semibold text-ink-900">
                      {customerFullName(l.customer)}
                    </td>
                    <td className="px-4 py-3 text-ink-900/70">
                      <a href={`tel:${l.customer.phone}`} onClick={(e) => e.stopPropagation()} className="hover:text-brand-electric">
                        {l.customer.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-ink-900/70">{l.serviceRequested}</td>
                    <td className="px-4 py-3 text-ink-900/70">{l.leadSource}</td>
                    <td className="px-4 py-3 text-ink-900/70">{formatMoney(l.estimatedValue)}</td>
                    <td className="px-4 py-3">
                      <QuickStatusSelect leadId={l.id} status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-900/60">{formatDate(l.dateReceived)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          isOverdue(l.followUpDate)
                            ? "font-semibold text-red-600"
                            : isDueToday(l.followUpDate)
                              ? "font-semibold text-amber-600"
                              : "text-ink-900/60"
                        }
                      >
                        {formatDate(l.followUpDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/leads/${l.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-semibold text-brand-electric hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((l) => (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="block rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink-900">{customerFullName(l.customer)}</div>
                    <div className="text-xs text-ink-900/50">{l.serviceRequested} · {l.leadSource}</div>
                  </div>
                  <div onClick={(e) => e.preventDefault()}>
                    <QuickStatusSelect leadId={l.id} status={l.status} />
                  </div>
                </div>
                <dl className="mt-3 flex flex-col gap-1 text-sm text-ink-900/70">
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Phone:</dt>
                    <dd>
                      <a href={`tel:${l.customer.phone}`} onClick={(e) => e.stopPropagation()}>
                        {l.customer.phone}
                      </a>
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Est. Value:</dt>
                    <dd>{formatMoney(l.estimatedValue)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Received:</dt>
                    <dd>{formatDate(l.dateReceived)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Follow-Up:</dt>
                    <dd
                      className={
                        isOverdue(l.followUpDate)
                          ? "font-semibold text-red-600"
                          : isDueToday(l.followUpDate)
                            ? "font-semibold text-amber-600"
                            : ""
                      }
                    >
                      {formatDate(l.followUpDate)}
                    </dd>
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
