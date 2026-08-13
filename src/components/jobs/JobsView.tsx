"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { customerFullName } from "@/lib/customers";
import { SERVICES } from "@/lib/leads";
import { STATUS_LABELS, isToday, isUpcoming } from "@/lib/jobs";
import QuickJobStatusSelect from "./QuickJobStatusSelect";
import type { Customer, Job } from "@prisma/client";

type JobWithCustomer = Omit<Job, "quotedPrice" | "finalPrice"> & {
  customer: Customer;
  quotedPrice: number | null;
  finalPrice: number | null;
};

type QuickFilter = "all" | "today" | "upcoming" | "completed" | "cancelled";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

export default function JobsView({ jobs }: { jobs: JobWithCustomer[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const cities = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.city).filter(Boolean))) as string[],
    [jobs]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return jobs.filter((j) => {
      if (quickFilter === "today" && !isToday(j.scheduledDate)) return false;
      if (quickFilter === "upcoming" && !isUpcoming(j.scheduledDate, j.status)) return false;
      if (quickFilter === "completed" && j.status !== "COMPLETED") return false;
      if (quickFilter === "cancelled" && j.status !== "CANCELLED") return false;

      if (statusFilter && j.status !== statusFilter) return false;
      if (serviceFilter && j.service !== serviceFilter) return false;
      if (cityFilter && j.city !== cityFilter) return false;
      if (dateFilter) {
        const d = new Date(j.scheduledDate).toISOString().slice(0, 10);
        if (d !== dateFilter) return false;
      }
      if (q) {
        const haystack = [
          j.jobNumber,
          customerFullName(j.customer),
          j.customer.phone,
          j.serviceAddress ?? "",
          j.city ?? "",
          j.service,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, query, quickFilter, statusFilter, serviceFilter, cityFilter, dateFilter]);

  const selectClasses =
    "rounded-lg border border-ink-900/15 px-3 py-2 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10";

  const quickFilters: { key: QuickFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {quickFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setQuickFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              quickFilter === f.key
                ? "bg-ink-950 text-white"
                : "border border-ink-900/15 text-ink-900/60 hover:border-ink-900/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

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
            placeholder="Search by job #, customer, phone, address, city, or service..."
            className="w-full rounded-lg border border-ink-900/15 py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClasses}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className={selectClasses}>
            <option value="">All Services</option>
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={selectClasses}>
            <option value="">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={selectClasses}
          />

          {(statusFilter || serviceFilter || cityFilter || dateFilter || query || quickFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusFilter("");
                setServiceFilter("");
                setCityFilter("");
                setDateFilter("");
                setQuickFilter("all");
              }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-electric hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <span className="text-xs font-medium text-ink-900/40">
          {filtered.length} of {jobs.length} job{jobs.length === 1 ? "" : "s"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white py-16 text-center text-sm text-ink-900/50">
          {jobs.length === 0 ? "No jobs yet." : "No jobs match your filters."}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/10 bg-ink-950/[0.02] text-left text-xs font-bold uppercase tracking-wide text-ink-900/50">
                  <th className="px-4 py-3">Job #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => (
                  <tr
                    key={j.id}
                    onClick={() => router.push(`/jobs/${j.id}`)}
                    className="cursor-pointer border-b border-ink-900/5 transition last:border-b-0 hover:bg-brand-electric/[0.03]"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-ink-900">{j.jobNumber}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{customerFullName(j.customer)}</td>
                    <td className="px-4 py-3 text-ink-900/70">
                      {j.customer.phone ? (
                        <a href={`tel:${j.customer.phone}`} onClick={(e) => e.stopPropagation()} className="hover:text-brand-electric">
                          {j.customer.phone}
                        </a>
                      ) : (
                        <span className="text-ink-900/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-900/70">{j.service}</td>
                    <td className="px-4 py-3 text-ink-900/70">{j.city ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-900/60">{formatDate(j.scheduledDate)}</td>
                    <td className="px-4 py-3 text-ink-900/60">{j.startTime ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-900/70">
                      {formatMoney(j.finalPrice ?? j.quotedPrice)}
                    </td>
                    <td className="px-4 py-3">
                      <QuickJobStatusSelect jobId={j.id} status={j.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/jobs/${j.id}`}
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
            {filtered.map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="block rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-xs font-semibold text-ink-900/50">{j.jobNumber}</div>
                    <div className="font-semibold text-ink-900">{customerFullName(j.customer)}</div>
                    <div className="text-xs text-ink-900/50">{j.service}</div>
                  </div>
                  <div onClick={(e) => e.preventDefault()}>
                    <QuickJobStatusSelect jobId={j.id} status={j.status} />
                  </div>
                </div>
                <dl className="mt-3 flex flex-col gap-1 text-sm text-ink-900/70">
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Phone:</dt>
                    <dd>
                      {j.customer.phone ? (
                        <a href={`tel:${j.customer.phone}`} onClick={(e) => e.stopPropagation()}>
                          {j.customer.phone}
                        </a>
                      ) : (
                        <span className="text-ink-900/40">Not provided</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Date:</dt>
                    <dd>
                      {formatDate(j.scheduledDate)}
                      {j.startTime ? ` at ${j.startTime}` : ""}
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">City:</dt>
                    <dd>{j.city ?? "—"}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Price:</dt>
                    <dd>{formatMoney(j.finalPrice ?? j.quotedPrice)}</dd>
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
