import Link from "next/link";
import { prisma } from "@/lib/prisma";
import CustomersView from "@/components/customers/CustomersView";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
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

      <CustomersView customers={customers} />
    </div>
  );
}
