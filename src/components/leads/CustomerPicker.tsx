"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { customerFullName } from "@/lib/customers";
import QuickAddCustomerModal from "./QuickAddCustomerModal";
import type { Customer } from "@prisma/client";

type Props = {
  value: string;
  valueLabel?: string;
  onChange: (customerId: string, label: string) => void;
};

export default function CustomerPicker({ value, valueLabel, onChange }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState(valueLabel ?? "");
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((body) => setCustomers(body.customers ?? []))
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter((c) =>
        [customerFullName(c), c.phone, c.email ?? ""].join(" ").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [customers, query]);

  function select(c: Customer) {
    onChange(c.id, `${customerFullName(c)} — ${c.phone}`);
    setQuery(`${customerFullName(c)} — ${c.phone}`);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-ink-900">Customer</label>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("", "");
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search by name, phone, or email..."
        className="rounded-lg border border-ink-900/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-electric focus:ring-4 focus:ring-brand-electric/10"
      />
      <input type="hidden" value={value} required />

      {open && (
        <div className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-ink-900/10 bg-white shadow-xl">
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-ink-900/40">No matching customers.</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => select(c)}
                  className="flex w-full flex-col items-start px-4 py-2.5 text-left text-sm hover:bg-brand-electric/5"
                >
                  <span className="font-semibold text-ink-900">{customerFullName(c)}</span>
                  <span className="text-xs text-ink-900/50">{c.phone}</span>
                </button>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowModal(true);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 border-t border-ink-900/10 bg-ink-950/[0.02] px-4 py-2.5 text-left text-sm font-semibold text-brand-electric hover:bg-brand-electric/5"
          >
            + Create New Customer
          </button>
        </div>
      )}

      {showModal && (
        <QuickAddCustomerModal
          onClose={() => setShowModal(false)}
          onCreated={(customer) => {
            setCustomers((prev) => [customer, ...prev]);
            select(customer);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
