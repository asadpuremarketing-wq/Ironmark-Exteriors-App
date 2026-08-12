"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { customerFullName, STATUS_LABELS, STATUS_STYLES } from "@/lib/customers";
import QuickActions from "./QuickActions";
import type { Customer } from "@prisma/client";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAddress(c: Customer) {
  const parts = [c.streetAddress, c.city].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

export default function CustomersView({ customers }: { customers: Customer[] }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;

    return customers.filter((c) => {
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
      return haystack.includes(q);
    });
  }, [customers, query]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
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
        <span className="shrink-0 text-xs font-medium text-ink-900/40">
          {filtered.length} of {customers.length} customer{customers.length === 1 ? "" : "s"}
        </span>
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
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">City</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Date Added</th>
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
                      <a
                        href={`tel:${c.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-brand-electric"
                      >
                        {c.phone}
                      </a>
                    </td>
                    <td className="px-5 py-3.5 text-ink-900/80">{c.email ?? "—"}</td>
                    <td className="px-5 py-3.5 text-ink-900/80">{c.city ?? "—"}</td>
                    <td className="px-5 py-3.5 text-ink-900/80">{formatAddress(c)}</td>
                    <td className="px-5 py-3.5 text-ink-900/60">{formatDate(c.createdAt)}</td>
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
                      <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}>
                        {c.phone}
                      </a>
                    </dd>
                  </div>
                  {c.email && (
                    <div className="flex gap-1.5">
                      <dt className="text-ink-900/40">Email:</dt>
                      <dd className="truncate">{c.email}</dd>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Address:</dt>
                    <dd>{formatAddress(c)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-ink-900/40">Added:</dt>
                    <dd>{formatDate(c.createdAt)}</dd>
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
