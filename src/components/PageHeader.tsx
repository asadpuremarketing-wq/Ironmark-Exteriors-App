"use client";

import { usePathname } from "next/navigation";

// Mirrors Sidebar's navItems — kept separate (not imported) so this stays a
// simple lookup with no risk of circular imports between the two.
const TITLES: { prefix: string; label: string }[] = [
  { prefix: "/dashboard", label: "Dashboard" },
  { prefix: "/customers", label: "Customers" },
  { prefix: "/leads", label: "Leads" },
  { prefix: "/jobs", label: "Jobs" },
  { prefix: "/calendar", label: "Calendar" },
  { prefix: "/invoices", label: "Invoices" },
  { prefix: "/expenses", label: "Expenses" },
  { prefix: "/marketing", label: "Marketing" },
  { prefix: "/reports", label: "Reports" },
  { prefix: "/settings", label: "Settings" },
];

function titleFor(pathname: string | null): string {
  if (!pathname) return "Ironmark Exteriors";
  const match = TITLES.find((t) => pathname === t.prefix || pathname.startsWith(t.prefix + "/"));
  return match?.label ?? "Ironmark Exteriors";
}

/**
 * Gives the desktop header a reason to exist beyond the account menu — it
 * was previously just an empty div, so there was no persistent on-screen
 * confirmation of which section you were in besides the page's own <h1>
 * scrolling past. This stays fixed at the top as you scroll.
 */
export default function PageHeader() {
  const pathname = usePathname();
  return <h1 className="text-lg font-bold tracking-tight text-ink-900">{titleFor(pathname)}</h1>;
}
