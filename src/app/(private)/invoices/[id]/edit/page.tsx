import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { customerLabel } from "@/lib/customers";
import InvoiceForm from "@/components/invoices/InvoiceForm";

type Params = Promise<{ id: string }>;

export default async function EditInvoicePage({ params }: { params: Params }) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { customer: true } });
  if (!invoice) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/invoices/${invoice.id}`} className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
        ← Back to Invoice
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">Edit Invoice</h1>

      <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <InvoiceForm
          mode="edit"
          lockCustomer
          initialValues={{
            id: invoice.id,
            customerId: invoice.customer.id,
            customerLabel: customerLabel(invoice.customer),
            jobId: invoice.jobId ?? undefined,
            invoiceDate: new Date(invoice.invoiceDate).toISOString().slice(0, 10),
            dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "",
            description: invoice.description,
            quantity: String(invoice.quantity),
            unitPrice: String(invoice.unitPrice),
            discount: String(invoice.discount),
            taxLabel: invoice.taxLabel,
            taxRate: String(invoice.taxRate),
            notes: invoice.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
