import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { customerFullName } from "@/lib/customers";
import CustomerForm from "@/components/customers/CustomerForm";

type Params = Promise<{ id: string }>;

export default async function EditCustomerPage({ params }: { params: Params }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/customers/${customer.id}`}
        className="text-sm font-medium text-ink-900/50 hover:text-ink-900"
      >
        ← Back to {customerFullName(customer)}
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">Edit Customer</h1>

      <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <CustomerForm
          mode="edit"
          initialValues={{
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            email: customer.email ?? "",
            streetAddress: customer.streetAddress ?? "",
            city: customer.city ?? "",
            province: customer.province,
            postalCode: customer.postalCode ?? "",
            notes: customer.notes ?? "",
            status: customer.status,
            emailMarketingConsent: customer.emailMarketingConsent,
            smsMarketingConsent: customer.smsMarketingConsent,
            doNotContact: customer.doNotContact,
          }}
        />
      </div>
    </div>
  );
}
