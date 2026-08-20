import {
  resolveDateRange,
  getRevenueStats,
  getExpenseStats,
  getProfitStats,
  getJobsReport,
  getLeadReport,
  DATE_RANGE_PRESETS,
  type DateRangePreset,
} from "@/lib/reports";
import { getLeadSourcePerformance, getOverallAdCostPerJob } from "@/lib/marketing";
import DateRangeSelector from "@/components/reports/DateRangeSelector";

function formatMoney(value: number) {
  return value.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

type SearchParams = Promise<{ range?: string; start?: string; end?: string }>;

function CsvLink({ type, qs }: { type: string; qs: string }) {
  return (
    <a
      href={`/api/reports/${type}/csv?${qs}`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-900/15 px-3 py-1.5 text-xs font-bold text-ink-900/70 transition hover:border-brand-electric hover:text-brand-electric"
    >
      Export CSV
    </a>
  );
}

function SectionCard({
  title,
  qsType,
  qs,
  children,
}: {
  title: string;
  qsType: string;
  qs: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-900/10 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-ink-900">{title}</h2>
        <CsvLink type={qsType} qs={qs} />
      </div>
      {children}
    </section>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const presetParam = (sp.range as DateRangePreset) ?? "this_month";
  const preset: DateRangePreset = DATE_RANGE_PRESETS.includes(presetParam) ? presetParam : "this_month";
  const range = resolveDateRange(preset, { start: sp.start, end: sp.end });
  const qs = new URLSearchParams({ range: preset, ...(sp.start ? { start: sp.start } : {}), ...(sp.end ? { end: sp.end } : {}) }).toString();

  const [revenue, expenses, jobsReport, leadReport, marketing, overall] = await Promise.all([
    getRevenueStats(range),
    getExpenseStats(range),
    getJobsReport(range),
    getLeadReport(range),
    getLeadSourcePerformance({ start: range.start, end: range.end }),
    getOverallAdCostPerJob({ start: range.start, end: range.end }),
  ]);
  const profit = getProfitStats(revenue, expenses);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Reports</h1>
          <p className="mt-1 text-sm text-ink-900/60">Financial and operational reports for {range.label}.</p>
        </div>
        <DateRangeSelector preset={preset} start={sp.start} end={sp.end} />
      </div>

      <div className="flex flex-col gap-6">
        <SectionCard title="Revenue" qsType="revenue" qs={qs}>
          <p className="mb-3 text-xs text-ink-900/40">
            Collected Revenue (payments received) and Invoiced Revenue (total billed) are always shown separately.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Collected Revenue" value={formatMoney(revenue.collectedRevenue)} />
            <Stat label="Invoiced Revenue" value={formatMoney(revenue.invoicedRevenue)} />
            <Stat label="Payments" value={String(revenue.paymentCount)} />
            <Stat label="Invoices" value={String(revenue.invoiceCount)} />
          </div>
        </SectionCard>

        <SectionCard title="Expenses" qsType="expense" qs={qs}>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Total Expenses" value={formatMoney(expenses.totalExpenses)} />
            <Stat label="Count" value={String(expenses.count)} />
          </div>
          <ResponsiveTable
            headers={["Category", "Total"]}
            rows={expenses.byCategory.map((c) => [c.category, formatMoney(c.total)])}
            emptyLabel="No expenses in this range."
          />
        </SectionCard>

        <SectionCard title="Profit" qsType="profit" qs={qs}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat label="Collected Revenue − Expenses" value={formatMoney(profit.collectedProfit)} />
            <Stat label="Invoiced Revenue − Expenses" value={formatMoney(profit.invoicedProfit)} />
          </div>
        </SectionCard>

        <SectionCard title="Jobs" qsType="jobs" qs={qs}>
          <ResponsiveTable
            headers={["Service", "Count", "Completed", "Revenue"]}
            rows={jobsReport.map((r) => [r.service, String(r.count), String(r.completed), formatMoney(r.revenue)])}
            emptyLabel="No jobs in this range."
          />
        </SectionCard>

        <SectionCard title="Leads" qsType="lead" qs={qs}>
          <ResponsiveTable
            headers={["Lead Source", "Count", "Booked", "Conversion Rate"]}
            rows={leadReport.map((r) => [r.leadSource, String(r.count), String(r.booked), `${r.conversionRate.toFixed(1)}%`])}
            emptyLabel="No leads in this range."
          />
        </SectionCard>

        <SectionCard title="Marketing (Cost Per Job Booked)" qsType="marketing" qs={qs}>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Cost Per Job"
              value={overall.costPerJob !== null ? formatMoney(overall.costPerJob) : "—"}
            />
            <Stat label="Total Ad Spend" value={formatMoney(overall.totalAdSpend)} />
            <Stat label="Jobs Booked" value={String(overall.totalJobsBooked)} />
            <Stat label="Revenue Generated" value={formatMoney(overall.totalRevenue)} />
          </div>
          <p className="mb-3 text-xs text-ink-900/40">By source, where each job&apos;s Source has been tagged:</p>
          <ResponsiveTable
            headers={["Source", "Leads", "Jobs Booked", "Spend", "Revenue", "Cost Per Job", "ROAS"]}
            rows={marketing.map((r) => [
              r.leadSource,
              String(r.leadCount),
              String(r.jobCount),
              formatMoney(r.spend),
              formatMoney(r.revenue),
              r.cac !== null ? formatMoney(r.cac) : "—",
              r.roas !== null ? `${r.roas.toFixed(2)}x` : "—",
            ])}
            emptyLabel="No marketing data in this range."
          />
        </SectionCard>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-900/5 bg-ink-950/[0.02] p-3 transition hover:border-brand-electric/20 hover:bg-brand-electric/[0.03]">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-900/40">{label}</div>
      <div className="mt-1 text-lg font-extrabold tabular-nums tracking-tight text-ink-900">{value}</div>
    </div>
  );
}

function ResponsiveTable({
  headers,
  rows,
  emptyLabel,
}: {
  headers: string[];
  rows: string[][];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-900/40">{emptyLabel}</p>;
  }
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-900/10 text-left text-xs font-bold uppercase tracking-wide text-ink-900/50">
              {headers.map((h) => (
                <th key={h} className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-ink-900/5 last:border-b-0">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-3 py-2 tabular-nums ${j === 0 ? "font-semibold text-ink-900" : "text-ink-900/70"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {rows.map((row, i) => (
          <div key={i} className="rounded-xl border border-ink-900/10 p-3">
            <div className="font-semibold text-ink-900">{row[0]}</div>
            <dl className="mt-1.5 flex flex-col gap-1 text-xs text-ink-900/60">
              {headers.slice(1).map((h, j) => (
                <div key={h} className="flex justify-between">
                  <dt>{h}</dt>
                  <dd>{row[j + 1]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
