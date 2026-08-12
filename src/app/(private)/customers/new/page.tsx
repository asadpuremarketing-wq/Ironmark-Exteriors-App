import CustomerForm from "@/components/customers/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Add Customer</h1>
      <p className="mt-1 text-sm text-ink-900/60">
        New customers default to <span className="font-semibold">Lead</span> status.
      </p>

      <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <CustomerForm mode="create" />
      </div>
    </div>
  );
}
