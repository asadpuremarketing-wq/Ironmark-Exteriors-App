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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="hidden h-16 items-center justify-between border-b border-ink-900/10 bg-white px-6 md:flex">
          <div className="text-sm text-ink-900/50">
            Signed in as{" "}
            <span className="font-semibold text-ink-900">{session?.user?.email}</span>
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1 bg-[#f7f7f8] p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
