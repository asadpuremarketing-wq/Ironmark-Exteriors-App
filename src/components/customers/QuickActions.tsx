"use client";

import Link from "next/link";

type Props = {
  customerId: string;
  phone: string | null;
  email: string | null;
  size?: "sm" | "md";
};

export default function QuickActions({ customerId, phone, email, size = "sm" }: Props) {
  const btn =
    size === "sm"
      ? "flex h-8 w-8 items-center justify-center rounded-lg border border-ink-900/10 text-ink-900/60 transition hover:border-brand-electric/40 hover:text-brand-electric"
      : "flex h-10 w-10 items-center justify-center rounded-lg border border-ink-900/10 text-ink-900/60 transition hover:border-brand-electric/40 hover:text-brand-electric";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="flex items-center gap-1.5">
      {phone && (
        <a href={`tel:${phone}`} aria-label="Call customer" className={btn} onClick={(e) => e.stopPropagation()}>
          <svg viewBox="0 0 20 20" className={icon} fill="currentColor">
            <path d="M2.5 4A1.5 1.5 0 0 1 4 2.5h2.1c.4 0 .74.27.84.66l.82 3.16a.9.9 0 0 1-.25.87L6.2 8.5a11.7 11.7 0 0 0 5.3 5.3l1.3-1.3a.9.9 0 0 1 .87-.25l3.16.82c.39.1.66.44.66.84V16a1.5 1.5 0 0 1-1.5 1.5H15C7.82 17.5 2.5 12.18 2.5 5V4z" />
          </svg>
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} aria-label="Email customer" className={btn} onClick={(e) => e.stopPropagation()}>
          <svg viewBox="0 0 20 20" className={icon} fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
            <path d="M3 5.5l7 5.5 7-5.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      )}
      <Link
        href={`/customers/${customerId}/edit`}
        aria-label="Edit customer"
        className={btn}
        onClick={(e) => e.stopPropagation()}
      >
        <svg viewBox="0 0 20 20" className={icon} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <Link
        href={`/customers/${customerId}`}
        aria-label="View customer"
        className={btn}
        onClick={(e) => e.stopPropagation()}
      >
        <svg viewBox="0 0 20 20" className={icon} fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="10" r="2.5" />
        </svg>
      </Link>
    </div>
  );
}
