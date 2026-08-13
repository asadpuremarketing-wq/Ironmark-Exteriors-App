import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { serializeInvoice } from "@/lib/invoices";
import InvoicesView from "@/components/invoices/InvoicesView";

function formatMoney(value: number) {
  return value.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default async function InvoicesPage() {
  const invoicesRaw = await prisma.invoice.findMany({
    where: { archivedAt: null },
    include: { customer: true, job: true, payments: true },
    orderBy: { invoiceDate: "desc" },
  });

  const invoices = invoicesRaw.map(serializeInvoice);

  const nowDate = new Date();
  const now = nowDate.getTime();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let totalOutstanding = 0;
  let overdueAmount = 0;
  let paidThisMonth = 0;

  for (let i = 0; i < invoicesRaw.length; i++) {
    const rawInvoice = invoicesRaw[i];
    const inv = invoices[i];
    const paidSum = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Math.max(0, Number(inv.total) - paidSum);

    if (inv.status !== "CANCELLED" && inv.status !== "REFUNDED") {
      totalOutstanding += remaining;
    }

    if (inv.status === "OVERDUE") {
      overdueAmount += remaining;
    }

    for (const p of rawInvoice.payments) {
      const paymentTime = new Date(p.paymentDate).getTime();
      if (paymentTime >= startOfMonth.getTime() && paymentTime <= now) {
        paidThisMonth += Number(p.amount);
      }
    }
  }

  const stats = [
    { label: "Total Outstanding", value: formatMoney(totalOutstanding) },
    { label: "Overdue", value: formatMoney(overdueAmount) },
    { label: "Paid This Month", value: formatMoney(paidThisMonth) },
    { label: "Total Invoices", value: String(invoices.length) },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Invoices</h1>
          <p className="mt-1 text-sm text-ink-900/60">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"} total
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand-electric px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 4v12M4 10h12" strokeLinecap="round" />
          </svg>
          New Invoice
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ink-900/10 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-900/40">{s.label}</div>
            <div className="mt-1 text-lg font-extrabold text-ink-900">{s.value}</div>
          </div>
        ))}
      </div>

      <InvoicesView invoices={invoices} />
    </div>
  );
}
