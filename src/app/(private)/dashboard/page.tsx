import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { followUpDueBoundary } from "@/lib/leads";
import { todayDateRangeUTC } from "@/lib/jobs";
import { customerFullName } from "@/lib/customers";

const placeholderStats = [
  { label: "Revenue", value: "$0", icon: "dollar" },
  { label: "Outstanding Invoices", value: "$0", icon: "file" },
  { label: "Expenses", value: "$0", icon: "receipt" },
] as const;

const icons: Record<string, string> = {
  briefcase: "M4 8h16v11H4V8zm4-4h8v4H8V4zm-4 8h16",
  dollar: "M12 3v18M17 7.5c0-1.9-2.2-3.5-5-3.5S7 5.6 7 7.5 9.2 11 12 11s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5",
  file: "M6 3h9l5 5v13H6V3zm9 0v5h5",
  receipt: "M5 3h14v18l-2-1.5L15 21l-2-1.5L11 21l-2-1.5L7 21l-2-1.5L5 21V3zm3 5h8m-8 4h8m-8 4h5",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7-3a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zM2 20c0-3.3 3.1-6 7-6s7 2.7 7 6H2zm14-4c2.8.3 5 2.1 5 4h-4",
  target: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  bell: "M12 3a5 5 0 0 0-5 5v3.6c0 .6-.2 1.1-.6 1.5L5 15h14l-1.4-1.9c-.4-.4-.6-.9-.6-1.5V8a5 5 0 0 0-5-5zM9.5 18a2.5 2.5 0 0 0 5 0",
  check: "M5 10.5l3.5 3.5 6.5-8",
};

function formatMoney(value: unknown) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];
  const { start: todayStart, end: todayEnd } = todayDateRangeUTC();

  const [
    totalCustomers,
    totalLeads,
    newLeads,
    followUpsDue,
    todaysJobs,
    upcomingJobs,
    completedJobs,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count({ where: { followUpDate: { not: null, lte: followUpDueBoundary() } } }),
    prisma.job.findMany({
      where: { scheduledDate: { gte: todayStart, lte: todayEnd } },
      include: { customer: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.job.count({
      where: { scheduledDate: { gte: todayStart }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    }),
    prisma.job.count({ where: { status: "COMPLETED" } }),
  ]);

  const stats = [
    { label: "Total Customers", value: String(totalCustomers), icon: "users" },
    { label: "Total Leads", value: String(totalLeads), icon: "target" },
    { label: "New Leads", value: String(newLeads), icon: "target" },
    { label: "Follow-Ups Due", value: String(followUpsDue), icon: "bell" },
    { label: "Today's Jobs", value: String(todaysJobs.length), icon: "briefcase" },
    { label: "Upcoming Jobs", value: String(upcomingJobs), icon: "briefcase" },
    { label: "Completed Jobs", value: String(completedJobs), icon: "check" },
    ...placeholderStats,
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
        Ironmark Exteriors Dashboard
      </h1>
      <p className="mt-1 text-sm text-ink-900/60">
        Welcome back{firstName ? `, ${firstName}` : ""}.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={`${stat.label}-${i}`}
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

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-900/50">
          Today&apos;s Jobs
        </h2>
        {todaysJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white py-10 text-center text-sm text-ink-900/40">
            Nothing scheduled for today.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm">
            <div className="flex flex-col divide-y divide-ink-900/5">
              {todaysJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm transition hover:bg-brand-electric/[0.03]"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-ink-900">{job.startTime ?? "—"}</span>
                    <span className="text-ink-900">{customerFullName(job.customer)}</span>
                    <span className="text-ink-900/50">{job.service}</span>
                    <span className="text-ink-900/40">{job.city ?? ""}</span>
                  </div>
                  <span className="font-semibold text-ink-900/70">
                    {formatMoney(job.finalPrice ?? job.quotedPrice)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
