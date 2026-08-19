import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Sidebar from "@/components/Sidebar";
import LogoutButton from "@/components/LogoutButton";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  // This is the real access-control check for every private page — the
  // proxy (src/proxy.ts) only provides a fast edge-level redirect for UX.
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const email = session?.user?.email ?? "";
  const name = session?.user?.name ?? "";
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-16 items-center justify-between border-b border-ink-900/10 bg-white/80 px-6 backdrop-blur-sm md:flex">
          <div />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-full border border-ink-900/10 bg-white py-1.5 pl-1.5 pr-4 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-electric to-brand-electric-light text-xs font-bold text-white shadow-electric">
                {initial}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-ink-900">{name || "Ironmark Admin"}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-ink-900/45">
                  <span>{email}</span>
                  <span className="rounded-full bg-brand-electric/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-electric">
                    Owner
                  </span>
                </div>
              </div>
            </div>
            <LogoutButton />
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden bg-[var(--surface-app)] p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
