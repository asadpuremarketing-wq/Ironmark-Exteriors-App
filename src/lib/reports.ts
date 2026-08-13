import { prisma } from "@/lib/prisma";

export const DATE_RANGE_PRESETS = [
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "this_quarter",
  "this_year",
  "custom",
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  this_quarter: "This Quarter",
  this_year: "This Year",
  custom: "Custom",
};

export type DateRange = { start: Date; end: Date; label: string };

// "Today" is evaluated in the business's local timezone (Ontario), not the
// server's — mirrors the exact pattern used in src/lib/jobs.ts and
// src/lib/leads.ts so date-range math lines up everywhere in the app.
function todayKeyInBusinessTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateKeyToUTCStart(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}
function dateKeyToUTCEnd(key: string): Date {
  return new Date(`${key}T23:59:59.999Z`);
}
function addDaysToKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Resolves a named preset (or explicit custom start/end date keys, in
 * YYYY-MM-DD form) into UTC Date boundaries, anchored to "today" in the
 * business's timezone (America/Toronto) rather than server local time.
 */
export function resolveDateRange(
  preset: DateRangePreset,
  custom?: { start?: string; end?: string }
): DateRange {
  const todayKey = todayKeyInBusinessTimezone();
  const [y, m] = todayKey.split("-").map(Number);

  switch (preset) {
    case "today":
      return { start: dateKeyToUTCStart(todayKey), end: dateKeyToUTCEnd(todayKey), label: "Today" };
    case "yesterday": {
      const key = addDaysToKey(todayKey, -1);
      return { start: dateKeyToUTCStart(key), end: dateKeyToUTCEnd(key), label: "Yesterday" };
    }
    case "this_week": {
      // Week starts Monday.
      const dow = new Date(`${todayKey}T00:00:00.000Z`).getUTCDay(); // 0=Sun
      const offsetToMonday = dow === 0 ? -6 : 1 - dow;
      const startKey = addDaysToKey(todayKey, offsetToMonday);
      const endKey = addDaysToKey(startKey, 6);
      return { start: dateKeyToUTCStart(startKey), end: dateKeyToUTCEnd(endKey), label: "This Week" };
    }
    case "this_month": {
      const startKey = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const endKey = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { start: dateKeyToUTCStart(startKey), end: dateKeyToUTCEnd(endKey), label: "This Month" };
    }
    case "this_quarter": {
      const quarterStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
      const quarterEndMonth = quarterStartMonth + 2;
      const startKey = `${y}-${String(quarterStartMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(Date.UTC(y, quarterEndMonth, 0)).getUTCDate();
      const endKey = `${y}-${String(quarterEndMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { start: dateKeyToUTCStart(startKey), end: dateKeyToUTCEnd(endKey), label: "This Quarter" };
    }
    case "this_year": {
      const startKey = `${y}-01-01`;
      const endKey = `${y}-12-31`;
      return { start: dateKeyToUTCStart(startKey), end: dateKeyToUTCEnd(endKey), label: "This Year" };
    }
    case "custom": {
      const startKey = custom?.start || todayKey;
      const endKey = custom?.end || todayKey;
      return { start: dateKeyToUTCStart(startKey), end: dateKeyToUTCEnd(endKey), label: "Custom" };
    }
    default:
      return { start: dateKeyToUTCStart(todayKey), end: dateKeyToUTCEnd(todayKey), label: "Today" };
  }
}

export function todayKeyBusiness(): string {
  return todayKeyInBusinessTimezone();
}

// ---- Aggregations ---------------------------------------------------------

export type OperationsStats = {
  jobsScheduled: number;
  jobsCompleted: number;
  jobsCancelled: number;
  jobsBooked: number;
};

export async function getOperationsStats(range: DateRange): Promise<OperationsStats> {
  const where = { scheduledDate: { gte: range.start, lte: range.end } };
  const [jobsScheduled, jobsCompleted, jobsCancelled, jobsBooked] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.job.count({ where: { ...where, status: "CANCELLED" } }),
    prisma.job.count({ where: { ...where, status: "BOOKED" } }),
  ]);
  return { jobsScheduled, jobsCompleted, jobsCancelled, jobsBooked };
}

export type SalesStats = {
  newLeads: number;
  jobsBooked: number;
  conversionRate: number; // 0-100
};

export async function getSalesStats(range: DateRange): Promise<SalesStats> {
  const leadWhere = { dateReceived: { gte: range.start, lte: range.end } };
  const [newLeads, bookedLeads] = await Promise.all([
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.count({ where: { ...leadWhere, status: "BOOKED" } }),
  ]);
  return {
    newLeads,
    jobsBooked: bookedLeads,
    conversionRate: newLeads > 0 ? (bookedLeads / newLeads) * 100 : 0,
  };
}

export type RevenueStats = {
  collectedRevenue: number; // sum(Payment.amount) in range — cash actually received
  invoicedRevenue: number; // sum(Invoice.total) in range — billed, may not be paid yet
  invoiceCount: number;
  paymentCount: number;
};

/**
 * Collected Revenue and Invoiced Revenue are deliberately kept separate.
 * Collected = sum(Payment.amount) where paymentDate falls in range.
 * Invoiced = sum(Invoice.total) where invoiceDate falls in range.
 * Never sum or conflate these two numbers.
 */
export async function getRevenueStats(range: DateRange): Promise<RevenueStats> {
  const [payments, invoices] = await Promise.all([
    prisma.payment.findMany({
      where: { paymentDate: { gte: range.start, lte: range.end } },
      select: { amount: true },
    }),
    prisma.invoice.findMany({
      where: {
        invoiceDate: { gte: range.start, lte: range.end },
        archivedAt: null,
        status: { notIn: ["CANCELLED"] },
      },
      select: { total: true },
    }),
  ]);

  return {
    collectedRevenue: payments.reduce((s, p) => s + Number(p.amount), 0),
    invoicedRevenue: invoices.reduce((s, i) => s + Number(i.total), 0),
    invoiceCount: invoices.length,
    paymentCount: payments.length,
  };
}

export type ExpenseStats = {
  totalExpenses: number;
  count: number;
  byCategory: { category: string; total: number }[];
};

export async function getExpenseStats(range: DateRange): Promise<ExpenseStats> {
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: range.start, lte: range.end }, archivedAt: null },
    select: { total: true, category: true },
  });

  const byCategoryMap = new Map<string, number>();
  for (const e of expenses) {
    byCategoryMap.set(e.category, (byCategoryMap.get(e.category) ?? 0) + Number(e.total));
  }

  return {
    totalExpenses: expenses.reduce((s, e) => s + Number(e.total), 0),
    count: expenses.length,
    byCategory: Array.from(byCategoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
  };
}

export type ProfitStats = {
  collectedProfit: number; // Collected Revenue - Expenses
  invoicedProfit: number; // Invoiced Revenue - Expenses
};

export function getProfitStats(revenue: RevenueStats, expenses: ExpenseStats): ProfitStats {
  return {
    collectedProfit: revenue.collectedRevenue - expenses.totalExpenses,
    invoicedProfit: revenue.invoicedRevenue - expenses.totalExpenses,
  };
}

// ---- Transaction ledger ----------------------------------------------------

export type LedgerEntry = {
  id: string;
  type: "payment" | "expense";
  date: Date;
  description: string;
  amount: number; // positive = money in (payment), negative = money out (expense)
};

export async function getTransactionLedger(range: DateRange, limit = 50): Promise<LedgerEntry[]> {
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { paymentDate: { gte: range.start, lte: range.end } },
      include: { customer: true, invoice: { select: { invoiceNumber: true } } },
      orderBy: { paymentDate: "desc" },
      take: limit,
    }),
    prisma.expense.findMany({
      where: { date: { gte: range.start, lte: range.end }, archivedAt: null },
      orderBy: { date: "desc" },
      take: limit,
    }),
  ]);

  const entries: LedgerEntry[] = [
    ...payments.map((p) => ({
      id: p.id,
      type: "payment" as const,
      date: p.paymentDate,
      description: `Payment from ${p.customer.firstName} ${p.customer.lastName} (${p.invoice.invoiceNumber})`,
      amount: Number(p.amount),
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      date: e.date,
      description: e.vendor ? `${e.vendor}${e.description ? " — " + e.description : ""}` : (e.description ?? "Expense"),
      amount: -Number(e.total),
    })),
  ];

  entries.sort((a, b) => b.date.getTime() - a.date.getTime());
  return entries.slice(0, limit);
}

// ---- Jobs / Lead reports ---------------------------------------------------

export type JobsReportRow = {
  service: string;
  count: number;
  completed: number;
  revenue: number;
};

export async function getJobsReport(range: DateRange): Promise<JobsReportRow[]> {
  const jobs = await prisma.job.findMany({
    where: { scheduledDate: { gte: range.start, lte: range.end } },
    select: { service: true, status: true, finalPrice: true, quotedPrice: true },
  });

  const map = new Map<string, JobsReportRow>();
  for (const j of jobs) {
    const row = map.get(j.service) ?? { service: j.service, count: 0, completed: 0, revenue: 0 };
    row.count += 1;
    if (j.status === "COMPLETED") {
      row.completed += 1;
      row.revenue += Number(j.finalPrice ?? j.quotedPrice ?? 0);
    }
    map.set(j.service, row);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export type LeadReportRow = {
  leadSource: string;
  count: number;
  booked: number;
  conversionRate: number;
};

export async function getLeadReport(range: DateRange): Promise<LeadReportRow[]> {
  const leads = await prisma.lead.findMany({
    where: { dateReceived: { gte: range.start, lte: range.end } },
    select: { leadSource: true, status: true },
  });

  const map = new Map<string, LeadReportRow>();
  for (const l of leads) {
    const row = map.get(l.leadSource) ?? { leadSource: l.leadSource, count: 0, booked: 0, conversionRate: 0 };
    row.count += 1;
    if (l.status === "BOOKED") row.booked += 1;
    map.set(l.leadSource, row);
  }
  const rows = Array.from(map.values());
  for (const row of rows) {
    row.conversionRate = row.count > 0 ? (row.booked / row.count) * 100 : 0;
  }
  return rows.sort((a, b) => b.count - a.count);
}

// ---- Customers Due for Service ---------------------------------------------

export type DueForServiceRow = {
  customerId: string;
  customerName: string;
  phone: string;
  service: string;
  lastServiceDate: Date;
  intervalMonths: number;
  monthsSince: number;
  status: "due" | "overdue";
};

/**
 * For each (customer, service) pair with at least one COMPLETED job, finds
 * the most recent completion date and compares months-since against the
 * configured ServiceReminderInterval for that service. Returns customers
 * who are due (within 1 month of the interval) or overdue (past it).
 */
export async function getCustomersDueForService(): Promise<DueForServiceRow[]> {
  const intervals = await prisma.serviceReminderInterval.findMany();
  if (intervals.length === 0) return [];

  const intervalByService = new Map(intervals.map((i) => [i.service.toLowerCase(), i.months]));

  const completedJobs = await prisma.job.findMany({
    where: { status: "COMPLETED" },
    select: {
      service: true,
      scheduledDate: true,
      customerId: true,
      customer: { select: { id: true, firstName: true, lastName: true, phone: true, status: true } },
    },
    orderBy: { scheduledDate: "desc" },
  });

  const latestByCustomerService = new Map<string, (typeof completedJobs)[number]>();
  for (const job of completedJobs) {
    const key = `${job.customerId}::${job.service.toLowerCase()}`;
    if (!latestByCustomerService.has(key)) {
      latestByCustomerService.set(key, job);
    }
  }

  const now = new Date();
  const rows: DueForServiceRow[] = [];

  for (const job of latestByCustomerService.values()) {
    if (job.customer.status === "DO_NOT_CONTACT") continue;
    const intervalMonths = intervalByService.get(job.service.toLowerCase());
    if (!intervalMonths) continue;

    const last = new Date(job.scheduledDate);
    const monthsSince =
      (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth());

    if (monthsSince >= intervalMonths) {
      rows.push({
        customerId: job.customer.id,
        customerName: `${job.customer.firstName} ${job.customer.lastName}`,
        phone: job.customer.phone,
        service: job.service,
        lastServiceDate: last,
        intervalMonths,
        monthsSince,
        status: monthsSince >= intervalMonths + 1 ? "overdue" : "due",
      });
    }
  }

  rows.sort((a, b) => b.monthsSince - a.monthsSince);
  return rows;
}

// ---- CSV helpers ------------------------------------------------------------

/** Escapes a single CSV field: wraps in quotes and doubles any embedded quotes if it contains a comma, quote, or newline. */
export function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\r\n");
}
