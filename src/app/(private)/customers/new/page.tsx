import Link from "next/link";
import CustomerForm from "@/components/customers/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/customers" className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
        ← Back to Customers
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">Add Customer</h1>
      <p className="mt-1 text-sm text-ink-900/60">
        New customers default to <span className="font-semibold">Lead</span> status.
      </p>

      <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <CustomerForm mode="create" />
      </div>
    </div>
  );
}
