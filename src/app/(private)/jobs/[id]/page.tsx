import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { customerFullName } from "@/lib/customers";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/jobs";
import JobStatusActions from "@/components/jobs/JobStatusActions";

type Params = Promise<{ id: string }>;

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function formatMoney(value: unknown) {
  if (value === null || value === undefined) return "Not set";
  return Number(value).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default async function JobDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { customer: true, lead: true, invoice: true },
  });
  if (!job) notFound();

  const { customer, lead } = job;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/jobs" className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
        ← Back to Jobs
      </Link>

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-lg font-extrabold tracking-tight text-ink-900">
              {job.jobNumber}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_STYLES[job.status]}`}
            >
              {STATUS_LABELS[job.status]}
            </span>
          </div>
          <p className="mt-1 text-lg font-semibold text-ink-900">
            {job.service} for {customerFullName(customer)}
          </p>
          <p className="mt-0.5 text-sm text-ink-900/50">
            Scheduled {formatDate(job.scheduledDate)}
            {job.startTime ? ` at ${job.startTime}` : ""}
          </p>
        </div>

        <JobStatusActions jobId={job.id} status={job.status} quotedPrice={job.quotedPrice ? Number(job.quotedPrice) : null} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {customer.phone && (
          <a
            href={`tel:${customer.phone}`}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-brand-electric/40 hover:text-brand-electric"
          >
            Call Customer
          </a>
        )}
        {customer.email && (
          <a
            href={`mailto:${customer.email}`}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-brand-electric/40 hover:text-brand-electric"
          >
            Email Customer
          </a>
        )}
        <Link
          href={`/customers/${customer.id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-brand-electric/40 hover:text-brand-electric"
        >
          View Customer
        </Link>
        {(job.serviceAddress || job.city) && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
              [job.serviceAddress, job.city, job.province, job.postalCode].filter(Boolean).join(", ")
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-brand-electric/40 hover:text-brand-electric"
          >
            Get Directions
          </a>
        )}
        {lead && (
          <Link
            href={`/leads/${lead.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-brand-electric/40 hover:text-brand-electric"
          >
            View Lead
          </Link>
        )}
        {job.status === "COMPLETED" && !job.invoice && (
          <Link
            href={`/invoices/new?jobId=${job.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-electric px-4 py-2.5 text-sm font-bold text-brand-electric transition hover:bg-brand-electric/5"
          >
            Create Invoice
          </Link>
        )}
        {job.invoice && (
          <Link
            href={`/invoices/${job.invoice.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-brand-electric/40 hover:text-brand-electric"
          >
            View Invoice
          </Link>
        )}
        <Link
          href={`/jobs/${job.id}/edit`}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-electric px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light"
        >
          Edit Job
        </Link>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">Customer</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-900/40">Name</dt>
              <dd className="text-ink-900">{customerFullName(customer)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Phone</dt>
              <dd>
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} className="text-ink-900 hover:text-brand-electric">
                    {customer.phone}
                  </a>
                ) : (
                  <span className="text-ink-900/40">Not provided</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Email</dt>
              <dd>
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="text-ink-900 hover:text-brand-electric">
                    {customer.email}
                  </a>
                ) : (
                  <span className="text-ink-900/40">Not provided</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Address</dt>
              <dd className="text-ink-900">
                {[customer.streetAddress, customer.city].filter(Boolean).join(", ") || "Not provided"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">Job</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-900/40">Job Number</dt>
              <dd className="font-mono text-ink-900">{job.jobNumber}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Service</dt>
              <dd className="text-ink-900">{job.service}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Service Address</dt>
              <dd className="text-ink-900">
                {[job.serviceAddress, job.city, job.province, job.postalCode].filter(Boolean).join(", ") ||
                  "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Date &amp; Time</dt>
              <dd className="text-ink-900">
                {formatDate(job.scheduledDate)}
                {job.startTime ? ` at ${job.startTime}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Estimated Duration</dt>
              <dd className="text-ink-900">{job.estimatedDuration ?? "Not set"}</dd>
            </div>
            {job.status === "COMPLETED" && (
              <>
                <div>
                  <dt className="text-xs text-ink-900/40">Actual Duration</dt>
                  <dd className="text-ink-900">{job.actualDuration ?? "Not recorded"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-900/40">Travel Time</dt>
                  <dd className="text-ink-900">{job.travelTime ?? "Not recorded"}</dd>
                </div>
              </>
            )}
          </dl>
        </section>

        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">Financial</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-900/40">Quoted Price</dt>
              <dd className="text-ink-900">{formatMoney(job.quotedPrice)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Final Price</dt>
              <dd className="text-ink-900">{formatMoney(job.finalPrice)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">
            Lead Information
          </h2>
          {lead ? (
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-xs text-ink-900/40">Lead Source</dt>
                <dd className="text-ink-900">{lead.leadSource}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-900/40">Original Lead</dt>
                <dd>
                  <Link href={`/leads/${lead.id}`} className="text-brand-electric hover:underline">
                    View Lead
                  </Link>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-ink-900/40">
              This job wasn&apos;t converted from a lead — it was created directly.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm sm:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">Notes</h2>
          {job.notes ? (
            <p className="whitespace-pre-wrap text-sm text-ink-900/80">{job.notes}</p>
          ) : (
            <p className="text-sm text-ink-900/40">No notes yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
