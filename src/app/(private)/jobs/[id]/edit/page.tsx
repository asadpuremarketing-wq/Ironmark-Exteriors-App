import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { customerFullName } from "@/lib/customers";
import JobForm from "@/components/jobs/JobForm";

type Params = Promise<{ id: string }>;

export default async function EditJobPage({ params }: { params: Params }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id }, include: { customer: true } });
  if (!job) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
        ← Back to Job {job.jobNumber}
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">Edit Job</h1>
      <p className="mt-1 text-sm text-ink-900/60">
        Changing the scheduled date or time will mark this job as{" "}
        <span className="font-semibold">Rescheduled</span> unless you pick a different status below.
      </p>

      <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <JobForm
          mode="edit"
          lockCustomer
          initialValues={{
            id: job.id,
            customerId: job.customerId,
            customerLabel: `${customerFullName(job.customer)} — ${job.customer.phone}`,
            leadId: job.leadId ?? undefined,
            service: job.service,
            serviceAddress: job.serviceAddress ?? "",
            city: job.city ?? "",
            province: job.province,
            postalCode: job.postalCode ?? "",
            scheduledDate: new Date(job.scheduledDate).toISOString().slice(0, 10),
            startTime: job.startTime ?? "",
            estimatedDuration: job.estimatedDuration ?? "",
            quotedPrice: job.quotedPrice ? String(job.quotedPrice) : "",
            finalPrice: job.finalPrice ? String(job.finalPrice) : "",
            status: job.status,
            notes: job.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
