import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { followUpDueBoundary } from "@/lib/leads";
import { todayDateRangeUTC } from "@/lib/jobs";
import { customerFullName } from "@/lib/customers";
import {
  resolveDateRange,
  getOperationsStats,
  getSalesStats,
  getRevenueStats,
  getExpenseStats,
  getProfitStats,
  getTransactionLedger,
  getCustomersDueForService,
  DATE_RANGE_PRESETS,
  type DateRangePreset,
} from "@/lib/reports";
import DateRangeSelector from "@/components/reports/DateRangeSelector";

const icons: Record<string, string> = {
  briefcase: "M4 8h16v11H4V8zm4-4h8v4H8V4zm-4 8h16",
  dollar: "M12 3v18M17 7.5c0-1.9-2.2-3.5-5-3.5S7 5.6 7 7.5 9.2 11 12 11s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5",
  file: "M6 3h9l5 5v13H6V3zm9 0v5h5",
  receipt: "M5 3h14v18l-2-1.5L15 21l-2-1.5L11 21l-2-1.5L7 21l-2-1.5L5 21V3zm3 5h8m-8 4h8m-8 4h5",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7-3a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zM2 20c0-3.3 3.1-6 7-6s7 2.7 7 6H2zm14-4c2.8.3 5 2.1 5 4h-4",
  target: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  bell: "M12 3a5 5 0 0 0-5 5v3.6c0 .6-.2 1.1-.6 1.5L5 15h14l-1.4-1.9c-.4-.4-.6-.9-.6-1.5V8a5 5 0 0 0-5-5zM9.5 18a2.5 2.5 0 0 0 5 0",
  check: "M5 10.5l3.5 3.5 6.5-8",
  chart: "M4 20V10m6 10V4m6 16v-7",
  plus: "M10 4v12M4 10h12",
};

function formatMoney(value: number) {
  return value.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-electric/10 text-brand-electric">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d={icons[icon]} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="text-2xl font-extrabold text-ink-900">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-900/50">{label}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-900/50">{children}</h2>;
}

type SearchParams = Promise<{ range?: string; start?: string; end?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const presetParam = (sp.range as DateRangePreset) ?? "this_month";
  const preset: DateRangePreset = DATE_RANGE_PRESETS.includes(presetParam) ? presetParam : "this_month";
  const range = resolveDateRange(preset, { start: sp.start, end: sp.end });

  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];
  const { start: todayStart, end: todayEnd } = todayDateRangeUTC();

  // Run in a small number of batches rather than one giant Promise.all —
  // the local ephemeral `prisma dev` connection proxy chokes on too many
  // simultaneous queries. Each batch itself still runs concurrently.
  const [totalCustomers, totalLeads, newLeads, followUpsDue] = await Promise.all([
    prisma.customer.count(),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count({ where: { followUpDate: { not: null, lte: followUpDueBoundary() } } }),
  ]);

  const [todaysJobs, upcomingJobs, completedJobs] = await Promise.all([
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

  const operations = await getOperationsStats(range);
  const sales = await getSalesStats(range);
  const revenue = await getRevenueStats(range);
  const expenses = await getExpenseStats(range);
  const ledger = await getTransactionLedger(range, 50);

  const [todaysPayments, todaysExpenses] = await Promise.all([
    prisma.payment.findMany({
      where: { paymentDate: { gte: todayStart, lte: todayEnd } },
      include: { customer: true },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.expense.findMany({
      where: { date: { gte: todayStart, lte: todayEnd }, archivedAt: null },
      orderBy: { date: "desc" },
    }),
  ]);

  const dueForService = await getCustomersDueForService();

  const profit = getProfitStats(revenue, expenses);

  const stats = [
    { label: "Total Customers", value: String(totalCustomers), icon: "users" },
    { label: "Total Leads", value: String(totalLeads), icon: "target" },
    { label: "New Leads", value: String(newLeads), icon: "target" },
    { label: "Follow-Ups Due", value: String(followUpsDue), icon: "bell" },
    { label: "Today's Jobs", value: String(todaysJobs.length), icon: "briefcase" },
    { label: "Upcoming Jobs", value: String(upcomingJobs), icon: "briefcase" },
    { label: "Completed Jobs", value: String(completedJobs), icon: "check" },
  ];

  const quickActions = [
    { label: "Add Customer", href: "/customers/new" },
    { label: "Add Lead", href: "/leads/new" },
    { label: "Book Job", href: "/jobs/new" },
    { label: "Create Invoice", href: "/invoices/new" },
    { label: "Record Payment", href: "/invoices" },
    { label: "Add Expense", href: "/expenses/new" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Ironmark Exteriors Dashboard</h1>
      <p className="mt-1 text-sm text-ink-900/60">Welcome back{firstName ? `, ${firstName}` : ""}.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard key={`${stat.label}-${i}`} {...stat} />
        ))}
      </div>

      <div className="mt-8">
        <SectionHeading>Today&apos;s Jobs</SectionHeading>
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
                    {formatMoney(Number(job.finalPrice ?? job.quotedPrice ?? 0))}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <SectionHeading>Quick Actions</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((qa) => (
            <Link
              key={qa.label}
              href={qa.href}
              className="flex min-h-[64px] items-center justify-center rounded-xl border border-ink-900/10 bg-white px-3 py-3 text-center text-sm font-bold text-ink-900 shadow-sm transition hover:border-brand-electric hover:text-brand-electric"
            >
              {qa.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Financial section with date range */}
      <div className="mt-10 flex flex-col gap-3">
        <h2 className="text-lg font-extrabold text-ink-900">Financial Overview</h2>
        <DateRangeSelector preset={preset} start={sp.start} end={sp.end} />
      </div>

      <div className="mt-4">
        <SectionHeading>Operations ({range.label})</SectionHeading>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Jobs Scheduled" value={String(operations.jobsScheduled)} icon="briefcase" />
          <StatCard label="Jobs Completed" value={String(operations.jobsCompleted)} icon="check" />
          <StatCard label="Jobs Booked" value={String(operations.jobsBooked)} icon="briefcase" />
          <StatCard label="Jobs Cancelled" value={String(operations.jobsCancelled)} icon="briefcase" />
        </div>
      </div>

      <div className="mt-6">
        <SectionHeading>Sales ({range.label})</SectionHeading>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="New Leads" value={String(sales.newLeads)} icon="target" />
          <StatCard label="Jobs Booked" value={String(sales.jobsBooked)} icon="check" />
          <StatCard label="Conversion Rate" value={`${sales.conversionRate.toFixed(1)}%`} icon="chart" />
        </div>
      </div>

      <div className="mt-6">
        <SectionHeading>Revenue ({range.label})</SectionHeading>
        <p className="mb-3 text-xs text-ink-900/40">
          Collected = cash actually received. Invoiced = total billed. These are never the same number.
        </p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Collected Revenue" value={formatMoney(revenue.collectedRevenue)} icon="dollar" />
          <StatCard label="Invoiced Revenue" value={formatMoney(revenue.invoicedRevenue)} icon="file" />
          <StatCard label="Payments" value={String(revenue.paymentCount)} icon="dollar" />
          <StatCard label="Invoices" value={String(revenue.invoiceCount)} icon="file" />
        </div>
      </div>

      <div className="mt-6">
        <SectionHeading>Expenses ({range.label})</SectionHeading>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Expenses" value={formatMoney(expenses.totalExpenses)} icon="receipt" />
          <StatCard label="Expense Count" value={String(expenses.count)} icon="receipt" />
        </div>
      </div>

      <div className="mt-6">
        <SectionHeading>Profit ({range.label})</SectionHeading>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
          <StatCard label="Collected − Expenses" value={formatMoney(profit.collectedProfit)} icon="dollar" />
          <StatCard label="Invoiced − Expenses" value={formatMoney(profit.invoicedProfit)} icon="dollar" />
        </div>
      </div>

      {/* Daily Financial View */}
      <div className="mt-10">
        <SectionHeading>Daily Financial View (Today)</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm">
            <div className="border-b border-ink-900/10 bg-ink-950/[0.02] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-900/50">
              Today&apos;s Payments
            </div>
            {todaysPayments.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-ink-900/40">No payments today.</div>
            ) : (
              <div className="flex flex-col divide-y divide-ink-900/5">
                {todaysPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-ink-900">{customerFullName(p.customer)}</span>
                    <span className="font-semibold text-green-700">+{formatMoney(Number(p.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm">
            <div className="border-b border-ink-900/10 bg-ink-950/[0.02] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-900/50">
              Today&apos;s Expenses
            </div>
            {todaysExpenses.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-ink-900/40">No expenses today.</div>
            ) : (
              <div className="flex flex-col divide-y divide-ink-900/5">
                {todaysExpenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-ink-900">{e.vendor ?? e.category}</span>
                    <span className="font-semibold text-red-700">-{formatMoney(Number(e.total))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="mt-10">
        <SectionHeading>Transaction Ledger ({range.label}, last 50)</SectionHeading>
        {ledger.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white py-10 text-center text-sm text-ink-900/40">
            No transactions in this range.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-900/10 bg-ink-950/[0.02] text-left text-xs font-bold uppercase tracking-wide text-ink-900/50">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry) => (
                    <tr key={`${entry.type}-${entry.id}`} className="border-b border-ink-900/5 last:border-b-0">
                      <td className="px-4 py-3 text-ink-900/60">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            entry.type === "payment" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {entry.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-900">{entry.description}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${entry.amount >= 0 ? "text-green-700" : "text-red-700"}`}
                      >
                        {entry.amount >= 0 ? "+" : ""}
                        {formatMoney(entry.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="flex flex-col gap-2 md:hidden">
              {ledger.map((entry) => (
                <div key={`${entry.type}-${entry.id}`} className="rounded-xl border border-ink-900/10 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink-900">{entry.description}</div>
                      <div className="text-xs text-ink-900/40">{formatDate(entry.date)}</div>
                    </div>
                    <span className={`shrink-0 font-bold ${entry.amount >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {entry.amount >= 0 ? "+" : ""}
                      {formatMoney(entry.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Customers Due for Service */}
      <div className="mt-10">
        <SectionHeading>Customers Due for Service</SectionHeading>
        {dueForService.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-900/15 bg-white py-10 text-center text-sm text-ink-900/40">
            No customers due for service right now.
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-sm md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-900/10 bg-ink-950/[0.02] text-left text-xs font-bold uppercase tracking-wide text-ink-900/50">
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Last Service</th>
                    <th className="px-4 py-3">Months Since</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dueForService.map((row) => (
                    <tr key={`${row.customerId}-${row.service}`} className="border-b border-ink-900/5 last:border-b-0">
                      <td className="px-4 py-3">
                        <Link href={`/customers/${row.customerId}`} className="font-semibold text-ink-900 hover:text-brand-electric">
                          {row.customerName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-900/70">{row.service}</td>
                      <td className="px-4 py-3 text-ink-900/60">{formatDate(row.lastServiceDate)}</td>
                      <td className="px-4 py-3 text-ink-900/60">{row.monthsSince} mo</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                            row.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 md:hidden">
              {dueForService.map((row) => (
                <Link
                  key={`${row.customerId}-${row.service}`}
                  href={`/customers/${row.customerId}`}
                  className="block rounded-xl border border-ink-900/10 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-ink-900">{row.customerName}</div>
                      <div className="text-xs text-ink-900/50">{row.service}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        row.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-ink-900/50">
                    Last service {formatDate(row.lastServiceDate)} · {row.monthsSince} mo ago
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
