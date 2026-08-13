import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  resolveDateRange,
  getExpenseStats,
  getJobsReport,
  getLeadReport,
  toCsv,
  DATE_RANGE_PRESETS,
  type DateRangePreset,
} from "@/lib/reports";
import { getLeadSourcePerformance } from "@/lib/marketing";

type Params = Promise<{ type: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { type } = await params;
  const { searchParams } = new URL(request.url);
  const presetParam = (searchParams.get("range") as DateRangePreset) ?? "this_month";
  const preset: DateRangePreset = DATE_RANGE_PRESETS.includes(presetParam) ? presetParam : "this_month";
  const range = resolveDateRange(preset, {
    start: searchParams.get("start") ?? undefined,
    end: searchParams.get("end") ?? undefined,
  });

  let csv: string;
  let filename: string;

  switch (type) {
    case "revenue": {
      const [payments, invoices] = await Promise.all([
        prisma.payment.findMany({
          where: { paymentDate: { gte: range.start, lte: range.end } },
          include: { customer: true, invoice: { select: { invoiceNumber: true } } },
          orderBy: { paymentDate: "desc" },
        }),
        prisma.invoice.findMany({
          where: { invoiceDate: { gte: range.start, lte: range.end }, archivedAt: null },
          include: { customer: true },
          orderBy: { invoiceDate: "desc" },
        }),
      ]);
      csv = toCsv(
        ["Kind", "Date", "Invoice #", "Customer", "Amount"],
        [
          ...payments.map((p) => [
            "Payment",
            p.paymentDate.toISOString().slice(0, 10),
            p.invoice.invoiceNumber,
            `${p.customer.firstName} ${p.customer.lastName}`,
            Number(p.amount).toFixed(2),
          ]),
          ...invoices.map((i) => [
            "Invoice",
            i.invoiceDate.toISOString().slice(0, 10),
            i.invoiceNumber,
            `${i.customer.firstName} ${i.customer.lastName}`,
            Number(i.total).toFixed(2),
          ]),
        ]
      );
      filename = `revenue-${preset}.csv`;
      break;
    }
    case "expense": {
      const stats = await getExpenseStats(range);
      csv = toCsv(
        ["Category", "Total"],
        stats.byCategory.map((c) => [c.category, c.total.toFixed(2)])
      );
      filename = `expenses-${preset}.csv`;
      break;
    }
    case "profit": {
      const [revenuePayments, revenueInvoices, expenseStats] = await Promise.all([
        prisma.payment.findMany({ where: { paymentDate: { gte: range.start, lte: range.end } }, select: { amount: true } }),
        prisma.invoice.findMany({
          where: { invoiceDate: { gte: range.start, lte: range.end }, archivedAt: null, status: { notIn: ["CANCELLED"] } },
          select: { total: true },
        }),
        getExpenseStats(range),
      ]);
      const collected = revenuePayments.reduce((s, p) => s + Number(p.amount), 0);
      const invoiced = revenueInvoices.reduce((s, i) => s + Number(i.total), 0);
      csv = toCsv(
        ["Metric", "Amount"],
        [
          ["Collected Revenue", collected.toFixed(2)],
          ["Invoiced Revenue", invoiced.toFixed(2)],
          ["Total Expenses", expenseStats.totalExpenses.toFixed(2)],
          ["Collected − Expenses", (collected - expenseStats.totalExpenses).toFixed(2)],
          ["Invoiced − Expenses", (invoiced - expenseStats.totalExpenses).toFixed(2)],
        ]
      );
      filename = `profit-${preset}.csv`;
      break;
    }
    case "jobs": {
      const rows = await getJobsReport(range);
      csv = toCsv(
        ["Service", "Count", "Completed", "Revenue"],
        rows.map((r) => [r.service, String(r.count), String(r.completed), r.revenue.toFixed(2)])
      );
      filename = `jobs-${preset}.csv`;
      break;
    }
    case "lead": {
      const rows = await getLeadReport(range);
      csv = toCsv(
        ["Lead Source", "Count", "Booked", "Conversion Rate %"],
        rows.map((r) => [r.leadSource, String(r.count), String(r.booked), r.conversionRate.toFixed(1)])
      );
      filename = `leads-${preset}.csv`;
      break;
    }
    case "marketing": {
      const rows = await getLeadSourcePerformance({ start: range.start, end: range.end });
      csv = toCsv(
        ["Lead Source", "Leads", "Jobs", "Conversion Rate %", "Spend", "Revenue", "CPL", "CAC", "ROAS"],
        rows.map((r) => [
          r.leadSource,
          String(r.leadCount),
          String(r.jobCount),
          r.conversionRate.toFixed(1),
          r.spend.toFixed(2),
          r.revenue.toFixed(2),
          r.cpl !== null ? r.cpl.toFixed(2) : "",
          r.cac !== null ? r.cac.toFixed(2) : "",
          r.roas !== null ? r.roas.toFixed(2) : "",
        ])
      );
      filename = `marketing-${preset}.csv`;
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown report type." }, { status: 400 });
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
