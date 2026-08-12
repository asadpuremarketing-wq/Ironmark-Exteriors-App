import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { customerFullName } from "@/lib/customers";
import { STATUS_LABELS, STATUS_STYLES, isOverdue, isDueToday } from "@/lib/leads";

type Params = Promise<{ id: string }>;

function formatDate(date: Date | string | null) {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function formatMoney(value: unknown) {
  if (value === null || value === undefined) return "Not provided";
  return Number(value).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default async function LeadDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id }, include: { customer: true } });
  if (!lead) notFound();

  const { customer } = lead;
  const overdue = isOverdue(lead.followUpDate);
  const dueToday = isDueToday(lead.followUpDate);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/leads" className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
        ← Back to Leads
      </Link>

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
              {customerFullName(customer)}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_STYLES[lead.status]}`}
            >
              {STATUS_LABELS[lead.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-900/50">
            {lead.serviceRequested} lead received {formatDate(lead.dateReceived)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`tel:${customer.phone}`}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-brand-electric/40 hover:text-brand-electric"
          >
            Call Customer
          </a>
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
          <Link
            href={`/leads/${lead.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-electric px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-electric-light"
          >
            Edit Lead
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">
            Customer Information
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
            <div>
              <dt className="text-xs text-ink-900/40">Address</dt>
              <dd className="text-ink-900">
                {[customer.streetAddress, customer.city].filter(Boolean).join(", ") || "Not provided"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">
            Lead Details
          </h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-900/40">Service Requested</dt>
              <dd className="text-ink-900">{lead.serviceRequested}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Lead Source</dt>
              <dd className="text-ink-900">{lead.leadSource}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Estimated Value</dt>
              <dd className="text-ink-900">{formatMoney(lead.estimatedValue)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Follow-Up Date</dt>
              <dd
                className={
                  overdue
                    ? "font-semibold text-red-600"
                    : dueToday
                      ? "font-semibold text-orange-600"
                      : "text-ink-900"
                }
              >
                {formatDate(lead.followUpDate)}
                {overdue && " (Overdue)"}
                {dueToday && " (Due Today)"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm sm:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">Notes</h2>
          {lead.notes ? (
            <p className="whitespace-pre-wrap text-sm text-ink-900/80">{lead.notes}</p>
          ) : (
            <p className="text-sm text-ink-900/40">No notes yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
