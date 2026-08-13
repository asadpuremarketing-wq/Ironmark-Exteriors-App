import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { customerFullName, customerLabel } from "@/lib/customers";
import InvoiceForm from "@/components/invoices/InvoiceForm";

type SearchParams = Promise<{ customerId?: string; jobId?: string }>;

export default async function NewInvoicePage({ searchParams }: { searchParams: SearchParams }) {
  const { customerId, jobId } = await searchParams;

  if (jobId) {
    const job = await prisma.job.findUnique({ where: { id: jobId }, include: { customer: true } });
    if (!job) notFound();

    const existingInvoice = await prisma.invoice.findUnique({ where: { jobId: job.id } });

    return (
      <div className="mx-auto max-w-3xl">
        <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
          ← Back to Job
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">Create Invoice</h1>
        <p className="mt-1 text-sm text-ink-900/60">
          From {job.service} job for {customerFullName(job.customer)}.
        </p>

        <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          {existingInvoice ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">This job already has an invoice.</p>
              <Link
                href={`/invoices/${existingInvoice.id}`}
                className="mt-2 inline-flex text-sm font-semibold text-amber-900 underline"
              >
                View the existing invoice
              </Link>
            </div>
          ) : (
            <InvoiceForm
              mode="create"
              lockCustomer
              initialValues={{
                customerId: job.customer.id,
                customerLabel: customerLabel(job.customer),
                jobId: job.id,
                description: job.service,
                unitPrice: job.finalPrice
                  ? String(job.finalPrice)
                  : job.quotedPrice
                    ? String(job.quotedPrice)
                    : "",
              }}
            />
          )}
        </div>
      </div>
    );
  }

  const preselected = customerId
    ? await prisma.customer.findUnique({ where: { id: customerId } })
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      {preselected ? (
        <Link
          href={`/customers/${preselected.id}`}
          className="text-sm font-medium text-ink-900/50 hover:text-ink-900"
        >
          ← Back to {customerFullName(preselected)}
        </Link>
      ) : (
        <Link href="/invoices" className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
          ← Back to Invoices
        </Link>
      )}
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">New Invoice</h1>

      <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <InvoiceForm
          mode="create"
          initialValues={
            preselected
              ? {
                  customerId: preselected.id,
                  customerLabel: customerLabel(preselected),
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
