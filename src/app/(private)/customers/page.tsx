import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CustomersView from "@/components/customers/CustomersView";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      jobs: { select: { service: true, status: true, scheduledDate: true } },
      leads: { select: { leadSource: true }, orderBy: { dateReceived: "desc" }, take: 1 },
      invoices: {
        where: { archivedAt: null, status: { notIn: ["CANCELLED", "REFUNDED"] } },
        select: { total: true },
      },
    },
  });

  const enriched = customers.map((c) => {
    const completedJobs = c.jobs.filter((j) => j.status === "COMPLETED");
    const lastServiceDate = completedJobs.length
      ? completedJobs.reduce((latest, j) => (j.scheduledDate > latest ? j.scheduledDate : latest), completedJobs[0].scheduledDate)
      : null;
    const services = Array.from(new Set(c.jobs.map((j) => j.service)));
    const lifetimeRevenue = c.invoices.reduce((s, i) => s + Number(i.total), 0);
    return {
      ...c,
      jobCount: c.jobs.length,
      services,
      lastServiceDate,
      lifetimeRevenue,
      leadSource: c.leads[0]?.leadSource ?? null,
    };
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Customers</h1>
          <p className="mt-1 text-sm text-ink-900/60">
            {customers.length} customer{customers.length === 1 ? "" : "s"} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this hits an API route, not a page */}
          <a
            href="/api/customers/csv"
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-ink-900/15 px-4 py-2.5 text-sm font-bold text-ink-900/70 transition hover:border-brand-electric hover:text-brand-electric"
          >
            Export CSV
          </a>
          <Link
            href="/customers/new"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-brand-electric px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 4v12M4 10h12" strokeLinecap="round" />
            </svg>
            Add Customer
          </Link>
        </div>
      </div>

      <CustomersView customers={enriched} />
    </div>
  );
}
