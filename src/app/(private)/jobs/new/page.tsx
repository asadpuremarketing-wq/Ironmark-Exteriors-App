import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { customerFullName } from "@/lib/customers";
import JobForm from "@/components/jobs/JobForm";

type SearchParams = Promise<{ customerId?: string; leadId?: string; date?: string }>;

export default async function NewJobPage({ searchParams }: { searchParams: SearchParams }) {
  const { customerId, leadId, date } = await searchParams;

  // Converting a lead into a job — lock the customer and pre-fill
  // everything we already know from the lead.
  if (leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { customer: true } });
    if (!lead) notFound();

    const existingJob = await prisma.job.findUnique({ where: { leadId: lead.id } });

    return (
      <div className="mx-auto max-w-3xl">
        <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
          ← Back to Lead
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">Book Job</h1>
        <p className="mt-1 text-sm text-ink-900/60">
          Booking from {lead.serviceRequested} lead for {customerFullName(lead.customer)}.
        </p>

        <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          {existingJob ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">
                This lead has already been converted into a job.
              </p>
              <Link
                href={`/jobs/${existingJob.id}`}
                className="mt-2 inline-flex text-sm font-semibold text-amber-900 underline"
              >
                View the existing job
              </Link>
            </div>
          ) : (
            <JobForm
              mode="create"
              lockCustomer
              initialValues={{
                customerId: lead.customer.id,
                customerLabel: `${customerFullName(lead.customer)} — ${lead.customer.phone}`,
                leadId: lead.id,
                service: lead.serviceRequested,
                serviceAddress: lead.customer.streetAddress ?? "",
                city: lead.customer.city ?? "",
                province: lead.customer.province,
                postalCode: lead.customer.postalCode ?? "",
                quotedPrice: lead.estimatedValue ? String(lead.estimatedValue) : "",
                ...(date ? { scheduledDate: date } : {}),
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
        <Link href="/jobs" className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
          ← Back to Jobs
        </Link>
      )}
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">Add Job</h1>
      <p className="mt-1 text-sm text-ink-900/60">
        New jobs default to <span className="font-semibold">Booked</span> status.
      </p>

      <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <JobForm
          mode="create"
          initialValues={
            preselected
              ? {
                  customerId: preselected.id,
                  customerLabel: `${customerFullName(preselected)} — ${preselected.phone}`,
                  serviceAddress: preselected.streetAddress ?? "",
                  city: preselected.city ?? "",
                  province: preselected.province,
                  postalCode: preselected.postalCode ?? "",
                  ...(date ? { scheduledDate: date } : {}),
                }
              : date
                ? { scheduledDate: date }
                : undefined
          }
        />
      </div>
    </div>
  );
}
