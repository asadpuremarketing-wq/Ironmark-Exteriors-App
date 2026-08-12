import { prisma } from "@/lib/prisma";
import { customerFullName } from "@/lib/customers";
import LeadForm from "@/components/leads/LeadForm";

type SearchParams = Promise<{ customerId?: string }>;

export default async function NewLeadPage({ searchParams }: { searchParams: SearchParams }) {
  const { customerId } = await searchParams;

  const preselected = customerId
    ? await prisma.customer.findUnique({ where: { id: customerId } })
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Add Lead</h1>
      <p className="mt-1 text-sm text-ink-900/60">
        New leads default to <span className="font-semibold">New</span> status.
      </p>

      <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <LeadForm
          mode="create"
          initialValues={
            preselected
              ? {
                  customerId: preselected.id,
                  customerLabel: `${customerFullName(preselected)} — ${preselected.phone}`,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
