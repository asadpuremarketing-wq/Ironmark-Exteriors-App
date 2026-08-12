import { auth } from "@/auth";

const stats = [
  { label: "Today's Jobs", value: "0", icon: "briefcase" },
  { label: "Revenue", value: "$0", icon: "dollar" },
  { label: "Outstanding Invoices", value: "$0", icon: "file" },
  { label: "Expenses", value: "$0", icon: "receipt" },
] as const;

const icons: Record<string, string> = {
  briefcase: "M4 8h16v11H4V8zm4-4h8v4H8V4zm-4 8h16",
  dollar: "M12 3v18M17 7.5c0-1.9-2.2-3.5-5-3.5S7 5.6 7 7.5 9.2 11 12 11s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5",
  file: "M6 3h9l5 5v13H6V3zm9 0v5h5",
  receipt: "M5 3h14v18l-2-1.5L15 21l-2-1.5L11 21l-2-1.5L7 21l-2-1.5L5 21V3zm3 5h8m-8 4h8m-8 4h5",
};

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
        Ironmark Exteriors Dashboard
      </h1>
      <p className="mt-1 text-sm text-ink-900/60">
        Welcome back{firstName ? `, ${firstName}` : ""}.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-electric/10 text-brand-electric">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d={icons[stat.icon]} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-2xl font-extrabold text-ink-900">{stat.value}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-900/50">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
