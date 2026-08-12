"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", ready: true, icon: "grid" },
  { href: "/customers", label: "Customers", ready: true, icon: "users" },
  { href: "/leads", label: "Leads", ready: false, icon: "target" },
  { href: "/jobs", label: "Jobs", ready: false, icon: "briefcase" },
  { href: "/calendar", label: "Calendar", ready: false, icon: "calendar" },
  { href: "/invoices", label: "Invoices", ready: false, icon: "file" },
  { href: "/expenses", label: "Expenses", ready: false, icon: "receipt" },
  { href: "/marketing", label: "Marketing", ready: false, icon: "megaphone" },
  { href: "/reports", label: "Reports", ready: false, icon: "chart" },
  { href: "/settings", label: "Settings", ready: true, icon: "settings" },
] as const;

const icons: Record<string, string> = {
  grid: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7-3a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zM2 20c0-3.3 3.1-6 7-6s7 2.7 7 6H2zm14-4c2.8.3 5 2.1 5 4h-4",
  target: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  briefcase: "M4 8h16v11H4V8zm4-4h8v4H8V4zm-4 8h16",
  calendar: "M4 5h16v15H4V5zm0 5h16M8 3v4M16 3v4",
  file: "M6 3h9l5 5v13H6V3zm9 0v5h5",
  receipt: "M5 3h14v18l-2-1.5L15 21l-2-1.5L11 21l-2-1.5L7 21l-2-1.5L5 21V3zm3 5h8m-8 4h8m-8 4h5",
  megaphone: "M3 10v4h4l6 4V6l-6 4H3zm14-2a4 4 0 0 1 0 8",
  chart: "M4 20V10m6 10V4m6 16v-7",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12h2m12 0h2M12 4v2m0 12v2m-5.7-13.7 1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4M6.3 17.7l-1.4 1.4",
};

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavList = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-brand-electric/15 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d={icons[item.icon]} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="flex-1">{item.label}</span>
            {!item.ready && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-white/40">
                Soon
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 bg-ink-950 px-4 md:hidden">
        <span className="text-sm font-extrabold tracking-tight text-white">
          IRONMARK <span className="font-light text-brand-electric-light">EXTERIORS</span>
        </span>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5"
        >
          <span className={`h-0.5 w-5 bg-white transition ${mobileOpen ? "translate-y-2 rotate-45" : ""}`} />
          <span className={`h-0.5 w-5 bg-white transition ${mobileOpen ? "opacity-0" : ""}`} />
          <span className={`h-0.5 w-5 bg-white transition ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`} />
        </button>
      </div>
      {mobileOpen && (
        <div className="flex flex-col border-b border-white/10 bg-ink-950 py-3 md:hidden">
          {NavList}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-ink-950 py-6 md:flex">
        <div className="mb-8 px-5">
          <span className="text-lg font-extrabold tracking-tight text-white">
            IRONMARK
          </span>
          <div className="text-xs font-light tracking-widest text-brand-electric-light">
            EXTERIORS
          </div>
        </div>
        {NavList}
      </aside>
    </>
  );
}
