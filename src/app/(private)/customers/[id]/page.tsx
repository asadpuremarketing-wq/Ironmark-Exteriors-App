import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { customerFullName, STATUS_LABELS, STATUS_STYLES } from "@/lib/customers";
import QuickActions from "@/components/customers/QuickActions";

type Params = Promise<{ id: string }>;

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const placeholders = [
  { title: "Jobs", description: "Job history will appear here once the Jobs module is built." },
  { title: "Invoices", description: "Invoices will appear here once the Invoices module is built." },
  { title: "Payments", description: "Payment history will appear here once Payments is built." },
  { title: "Revenue", description: "Lifetime revenue from this customer will be calculated here." },
  { title: "Service History", description: "A timeline of completed services will appear here." },
];

export default async function CustomerProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

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

        <div className="flex items-center gap-3">
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
