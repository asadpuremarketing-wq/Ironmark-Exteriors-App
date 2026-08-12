import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { customerFullName } from "@/lib/customers";
import LeadForm from "@/components/leads/LeadForm";

type Params = Promise<{ id: string }>;

export default async function EditLeadPage({ params }: { params: Params }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id }, include: { customer: true } });
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
        ← Back to Lead
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">Edit Lead</h1>

      <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <LeadForm
          mode="edit"
          initialValues={{
            id: lead.id,
            customerId: lead.customerId,
            customerLabel: `${customerFullName(lead.customer)} — ${lead.customer.phone}`,
            serviceRequested: lead.serviceRequested,
            leadSource: lead.leadSource,
            estimatedValue: lead.estimatedValue ? String(lead.estimatedValue) : "",
            status: lead.status,
            dateReceived: new Date(lead.dateReceived).toISOString().slice(0, 10),
            followUpDate: lead.followUpDate ? new Date(lead.followUpDate).toISOString().slice(0, 10) : "",
            notes: lead.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
