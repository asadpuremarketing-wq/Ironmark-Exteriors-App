"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { customerFullName, STATUS_LABELS, STATUS_STYLES } from "@/lib/customers";
import QuickActions from "./QuickActions";
import type { Customer, CustomerStatus } from "@prisma/client";

type EnrichedCustomer = Customer & {
  jobCount: number;
  services: string[];
  lastServiceDate: Date | string | null;
  lifetimeRevenue: number;
  leadSource: string | null;
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(value: number) {
  return value.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

function formatAddress(c: Customer) {
  const parts = [c.streetAddress, c.city].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

const STATUS_TABS: { value: CustomerStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE_CUSTOMER", label: "Active" },
  { value: "PAST_CUSTOMER", label: "Past Customers" },
  { value: "DO_NOT_CONTACT", label: "Do Not Contact" },
];

export default function CustomersView({ customers }: { customers: EnrichedCustomer[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "">("");
  const [cityFilter, setCityFilter] = useState("");
  const [postalFilter, setPostalFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [leadSourceFilter, setLeadSourceFilter] = useState("");
  const [minJobCount, setMinJobCount] = useState("");
  const [minRevenue, setMinRevenue] = useState("");
  const [maxRevenue, setMaxRevenue] = useState("");
  const [lastServiceAfter, setLastServiceAfter] = useState("");
  const [lastServiceBefore, setLastServiceBefore] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();

  const allCities = useMemo(
    () => Array.from(new Set(customers.map((c) => c.city).filter(Boolean))) as string[],
    [customers]
  );
  const allServices = useMemo(
    () => Array.from(new Set(customers.flatMap((c) => c.services))).sort(),
    [customers]
  );
  const allLeadSources = useMemo(
    () => Array.from(new Set(customers.map((c) => c.leadSource).filter(Boolean))) as string[],
    [customers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (cityFilter && c.city !== cityFilter) return false;
      if (postalFilter && !(c.postalCode ?? "").toLowerCase().includes(postalFilter.toLowerCase())) return false;
      if (serviceFilter && !c.services.includes(serviceFilter)) return false;
      if (leadSourceFilter && c.leadSource !== leadSourceFilter) return false;
      if (minJobCount && c.jobCount < Number(minJobCount)) return false;
      if (minRevenue && c.lifetimeRevenue < Number(minRevenue)) return false;
      if (maxRevenue && c.lifetimeRevenue > Number(maxRevenue)) return false;
      if (lastServiceAfter) {
        if (!c.lastServiceDate || new Date(c.lastServiceDate) < new Date(lastServiceAfter)) return false;
      }
      if (lastServiceBefore) {
        if (!c.lastServiceDate || new Date(c.lastServiceDate) > new Date(lastServiceBefore)) return false;
      }
      if (q) {
        const haystack = [
          c.firstName,
          c.lastName,
          customerFullName(c),
          c.phone,
          c.email ?? "",
          c.streetAddress ?? "",
          c.city ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    customers,
    query,
    statusFilter,
    cityFilter,
    postalFilter,
    serviceFilter,
    leadSourceFilter,
    minJobCount,
    minRevenue,
    maxRevenue,
    lastServiceAfter,
    lastServiceBefore,
  ]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
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
              placeholder="Search by name, phone, email, or address..."
              className="w-full rounded-lg border border-ink-900/15 py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-ink-900/15 px-4 py-2.5 text-sm font-bold text-ink-900/70 hover:border-brand-electric hover:text-brand-electric"
          >
            {showFilters ? "Hide Filters" : "More Filters"}
          </button>
          <span className="shrink-0 text-xs font-medium text-ink-900/40">
            {filtered.length} of {customers.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                statusFilter === tab.value
                  ? "bg-brand-electric text-white"
                  : "bg-ink-900/5 text-ink-900/60 hover:bg-ink-900/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-ink-900/10 bg-ink-950/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink-900/50">
              City
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-900"
              >
                <option value="">All cities</option>
                {allCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink-900/50">
              Postal Code contains
              <input
                value={postalFilter}
                onChange={(e) => setPostalFilter(e.target.value)}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink-900/50">
              Service
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-900"
              >
                <option value="">All services</option>
                {allServices.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink-900/50">
              Lead Source
              <select
                value={leadSourceFilter}
                onChange={(e) => setLeadSourceFilter(e.target.value)}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-900"
              >
                <option value="">All sources</option>
                {allLeadSources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink-900/50">
              Min Job Count
              <input
                type="number"
                min={0}
                value={minJobCount}
                onChange={(e) => setMinJobCount(e.target.value)}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-900"
              />
            </label>
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-ink-900/50">
                Min Lifetime Revenue
                <input
                  type="number"
                  min={0}
                  value={minRevenue}
                  onChange={(e) => setMinRevenue(e.target.value)}
                  className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-900"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-ink-900/50">
                Max Lifetime Revenue
                <input
                  type="number"
                  min={0}
                  value={maxRevenue}
                  onChange={(e) => setMaxRevenue(e.target.value)}
                  className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-900"
                />
              </label>
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-ink-900/50">
                Last Service After
                <input
                  type="date"
                  value={lastServiceAfter}
                  onChange={(e) => setLastServiceAfter(e.target.value)}
                  className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-900"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-ink-900/50">
                Last Service Before
                <input
                  type="date"
                  value={lastServiceBefore}
                  onChange={(e) => setLastServiceBefore(e.target.value)}
                  className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm text-ink-900"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white py-16 text-center text-sm text-ink-900/50">
          {customers.length === 0 ? "No customers yet." : "No customers match your search."}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/10 bg-ink-950/[0.02] text-left text-xs font-bold uppercase tracking-wide text-ink-900/50">
                  <th className="px-5 py-3">Customer Name</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">City</th>
                  <th className="px-5 py-3">Jobs</th>
                  <th className="px-5 py-3">Lifetime Revenue</th>
                  <th className="px-5 py-3">Last Service</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    className="cursor-pointer border-b border-ink-900/5 transition last:border-b-0 hover:bg-brand-electric/[0.03]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-ink-900">{customerFullName(c)}</div>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[c.status]}`}
                      >
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-900/80">
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-brand-electric"
                        >
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-ink-900/40">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-900/80">{c.city ?? "—"}</td>
                    <td className="px-5 py-3.5 text-ink-900/80">{c.jobCount}</td>
                    <td className="px-5 py-3.5 text-ink-900/80">{formatMoney(c.lifetimeRevenue)}</td>
                    <td className="px-5 py-3.5 text-ink-900/60">
                      {c.lastServiceDate ? formatDate(c.lastServiceDate) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end">
                        <QuickActions customerId={c.id} phone={c.phone} email={c.email} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="block rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-ink-900">{customerFullName(c)}</div>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[c.status]}`}
                    >
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  <QuickActions customerId={c.id} phone={c.phone} email={c.email} />
                </div>
                <dl className="mt-3 flex flex-col gap-1 text-sm text-ink-900/70">
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Phone:</dt>
                    <dd>
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}>
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-ink-900/40">Not provided</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Address:</dt>
                    <dd>{formatAddress(c)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Jobs:</dt>
                    <dd>{c.jobCount}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Lifetime Revenue:</dt>
                    <dd>{formatMoney(c.lifetimeRevenue)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Last Service:</dt>
                    <dd>{c.lastServiceDate ? formatDate(c.lastServiceDate) : "—"}</dd>
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
