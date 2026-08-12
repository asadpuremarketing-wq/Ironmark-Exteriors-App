import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { customerFullName, STATUS_LABELS, STATUS_STYLES } from "@/lib/customers";
import { STATUS_LABELS as LEAD_STATUS_LABELS, STATUS_STYLES as LEAD_STATUS_STYLES } from "@/lib/leads";
import { STATUS_LABELS as JOB_STATUS_LABELS, STATUS_STYLES as JOB_STATUS_STYLES } from "@/lib/jobs";
import QuickActions from "@/components/customers/QuickActions";
import DeleteCustomerButton from "@/components/customers/DeleteCustomerButton";

type Params = Promise<{ id: string }>;

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const placeholders = [
  { title: "Invoices", description: "Invoices will appear here once the Invoices module is built." },
  { title: "Payments", description: "Payment history will appear here once Payments is built." },
  { title: "Revenue", description: "Lifetime revenue from this customer will be calculated here." },
  { title: "Service History", description: "A timeline of completed services will appear here." },
];

function formatMoney(value: unknown) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}

export default async function CustomerProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const [customer, session, leads, jobs] = await Promise.all([
    prisma.customer.findUnique({ where: { id } }),
    auth(),
    prisma.lead.findMany({ where: { customerId: id }, orderBy: { createdAt: "desc" } }),
    prisma.job.findMany({ where: { customerId: id }, orderBy: { scheduledDate: "desc" } }),
  ]);
  if (!customer) notFound();

  const canDelete = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/customers" className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
            ← Back to Customers
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
              {customerFullName(customer)}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_STYLES[customer.status]}`}
            >
              {STATUS_LABELS[customer.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-900/50">
            Customer since {formatDate(customer.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <QuickActions
            customerId={customer.id}
            phone={customer.phone}
            email={customer.email}
            size="md"
          />
          <Link
            href={`/customers/${customer.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-electric px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light"
          >
            Edit Customer
          </Link>
          {canDelete && (
            <DeleteCustomerButton
              customerId={customer.id}
              customerName={customerFullName(customer)}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">
            Contact Information
          </h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-900/40">Name</dt>
              <dd className="text-ink-900">{customerFullName(customer)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Phone</dt>
              <dd>
                <a href={`tel:${customer.phone}`} className="text-ink-900 hover:text-brand-electric">
                  {customer.phone}
                </a>
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
          </dl>
        </section>

        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">
            Property Information
          </h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-900/40">Address</dt>
              <dd className="text-ink-900">{customer.streetAddress ?? "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">City</dt>
              <dd className="text-ink-900">{customer.city ?? "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Province</dt>
              <dd className="text-ink-900">{customer.province}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Postal Code</dt>
              <dd className="text-ink-900">{customer.postalCode ?? "Not provided"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm sm:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">Notes</h2>
          {customer.notes ? (
            <p className="whitespace-pre-wrap text-sm text-ink-900/80">{customer.notes}</p>
          ) : (
            <p className="text-sm text-ink-900/40">No notes yet.</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900/50">
            Leads ({leads.length})
          </h2>
          <Link
            href={`/leads/new?customerId=${customer.id}`}
            className="text-sm font-semibold text-brand-electric hover:underline"
          >
            + Add Lead
          </Link>
        </div>

        {leads.length === 0 ? (
          <p className="text-sm text-ink-900/40">No leads yet for this customer.</p>
        ) : (
          <div className="flex flex-col divide-y divide-ink-900/5">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm transition hover:bg-brand-electric/[0.03]"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-ink-900/60">
                    {new Date(lead.dateReceived).toLocaleDateString("en-CA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="font-semibold text-ink-900">{lead.serviceRequested}</span>
                  <span className="text-ink-900/50">{lead.leadSource}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-ink-900/70">{formatMoney(lead.estimatedValue)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${LEAD_STATUS_STYLES[lead.status]}`}
                  >
                    {LEAD_STATUS_LABELS[lead.status]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-900/50">
            Jobs ({jobs.length})
          </h2>
          <Link
            href={`/jobs/new?customerId=${customer.id}`}
            className="text-sm font-semibold text-brand-electric hover:underline"
          >
            + Add Job
          </Link>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-ink-900/40">No jobs yet for this customer.</p>
        ) : (
          <div className="flex flex-col divide-y divide-ink-900/5">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm transition hover:bg-brand-electric/[0.03]"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs text-ink-900/50">{job.jobNumber}</span>
                  <span className="text-ink-900/60">
                    {new Date(job.scheduledDate).toLocaleDateString("en-CA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="font-semibold text-ink-900">{job.service}</span>
                  <span className="text-ink-900/50">{job.city ?? "—"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-ink-900/70">
                    {formatMoney(job.finalPrice ?? job.quotedPrice)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${JOB_STATUS_STYLES[job.status]}`}
                  >
                    {JOB_STATUS_LABELS[job.status]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {placeholders.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl border border-dashed border-ink-900/15 bg-white p-6"
          >
            <h3 className="text-sm font-bold text-ink-900">{p.title}</h3>
            <p className="mt-1 text-xs text-ink-900/40">{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
