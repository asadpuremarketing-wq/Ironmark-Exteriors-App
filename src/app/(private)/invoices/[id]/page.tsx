import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { customerFullName } from "@/lib/customers";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES } from "@/lib/invoices";
import { PAYMENT_METHOD_LABELS } from "@/lib/expenses";
import InvoiceDetailActions from "@/components/invoices/InvoiceDetailActions";

type Params = Promise<{ id: string }>;

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function formatMoney(value: unknown) {
  return Number(value).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default async function InvoiceDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [invoice, session] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        job: true,
        payments: { orderBy: { paymentDate: "desc" } },
      },
    }),
    auth(),
  ]);
  if (!invoice) notFound();

  const { customer, job, payments } = invoice;
  const canRecordPayment = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";

  const paidSum = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, Number(invoice.total) - paidSum);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/invoices" className="text-sm font-medium text-ink-900/50 hover:text-ink-900 print:hidden">
        ← Back to Invoices
      </Link>

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-lg font-extrabold tracking-tight text-ink-900">
              {invoice.invoiceNumber}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${INVOICE_STATUS_STYLES[invoice.status]}`}
            >
              {INVOICE_STATUS_LABELS[invoice.status]}
            </span>
          </div>
          <p className="mt-1 text-lg font-semibold text-ink-900">
            {invoice.description} for {customerFullName(customer)}
          </p>
          <p className="mt-0.5 text-sm text-ink-900/50">
            Invoiced {formatDate(invoice.invoiceDate)}
            {invoice.dueDate ? ` · Due ${formatDate(invoice.dueDate)}` : ""}
          </p>
        </div>

        <Link
          href={`/invoices/${invoice.id}/edit`}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-ink-900/10 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:border-brand-electric/40 hover:text-brand-electric print:hidden"
        >
          Edit Invoice
        </Link>
      </div>

      <div className="mt-6 print:hidden">
        <InvoiceDetailActions invoiceId={invoice.id} remaining={remaining} canRecordPayment={canRecordPayment} />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">Bill To</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-900/40">Customer</dt>
              <dd>
                <Link href={`/customers/${customer.id}`} className="text-brand-electric hover:underline">
                  {customerFullName(customer)}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Phone</dt>
              <dd className="text-ink-900">{customer.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-900/40">Address</dt>
              <dd className="text-ink-900">
                {[customer.streetAddress, customer.city].filter(Boolean).join(", ") || "Not provided"}
              </dd>
            </div>
            {job && (
              <div>
                <dt className="text-xs text-ink-900/40">Job</dt>
                <dd>
                  <Link href={`/jobs/${job.id}`} className="text-brand-electric hover:underline">
                    {job.jobNumber}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">Line Item</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-900/40">Description</dt>
              <dd className="text-ink-900">{invoice.description}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-xs text-ink-900/40">Quantity × Unit Price</dt>
              <dd className="text-ink-900">
                {Number(invoice.quantity)} × {formatMoney(invoice.unitPrice)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm sm:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">Totals</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-ink-900/70">
              <span>Subtotal</span>
              <span>{formatMoney(invoice.subtotal)}</span>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-ink-900/70">
                <span>Discount</span>
                <span>-{formatMoney(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-900/70">
              <span>{invoice.taxLabel}</span>
              <span>{formatMoney(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-ink-900/10 pt-2 text-base font-bold text-ink-900">
              <span>Total</span>
              <span>{formatMoney(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-ink-900/70">
              <span>Paid</span>
              <span>{formatMoney(paidSum)}</span>
            </div>
            <div className="flex justify-between font-semibold text-ink-900">
              <span>Balance Due</span>
              <span>{formatMoney(remaining)}</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm sm:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">
            Payment History ({payments.length})
          </h2>
          {payments.length === 0 ? (
            <p className="text-sm text-ink-900/40">No payments recorded yet.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-900/10 text-left text-xs font-bold uppercase tracking-wide text-ink-900/50">
                      <th className="py-2">Date</th>
                      <th className="py-2">Method</th>
                      <th className="py-2">Reference</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-ink-900/5 last:border-b-0">
                        <td className="py-2.5 text-ink-900/70">{formatDate(p.paymentDate)}</td>
                        <td className="py-2.5 text-ink-900/70">{PAYMENT_METHOD_LABELS[p.method]}</td>
                        <td className="py-2.5 text-ink-900/70">{p.referenceNumber ?? "—"}</td>
                        <td className="py-2.5 text-right font-semibold text-ink-900">{formatMoney(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {payments.map((p) => (
                  <div key={p.id} className="rounded-xl border border-ink-900/10 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-900">{formatMoney(p.amount)}</span>
                      <span className="text-xs text-ink-900/50">{formatDate(p.paymentDate)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-ink-900/50">
                      <span>{PAYMENT_METHOD_LABELS[p.method]}</span>
                      <span>{p.referenceNumber ?? "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {invoice.notes && (
          <section className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm sm:col-span-2">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-900/50">Notes</h2>
            <p className="whitespace-pre-wrap text-sm text-ink-900/80">{invoice.notes}</p>
          </section>
        )}
      </div>
    </div>
  );
}
