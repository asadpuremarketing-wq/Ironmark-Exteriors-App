import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/reports";
import { STATUS_LABELS } from "@/lib/customers";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      jobs: { select: { service: true, status: true, scheduledDate: true } },
      invoices: {
        where: { archivedAt: null, status: { notIn: ["CANCELLED", "REFUNDED"] } },
        include: { payments: { select: { amount: true } } },
      },
    },
  });

  const rows = customers.map((c) => {
    const completedJobs = c.jobs.filter((j) => j.status === "COMPLETED");
    const lastServiceDate = completedJobs.length
      ? completedJobs.reduce((latest, j) => (j.scheduledDate > latest ? j.scheduledDate : latest), completedJobs[0].scheduledDate)
      : null;
    const lifetimeInvoiced = c.invoices.reduce((s, i) => s + Number(i.total), 0);
    const totalPaid = c.invoices.reduce(
      (s, i) => s + i.payments.reduce((ps, p) => ps + Number(p.amount), 0),
      0
    );

    return [
      `${c.firstName} ${c.lastName}`,
      c.phone,
      c.email ?? "",
      c.streetAddress ?? "",
      c.city ?? "",
      c.province,
      c.postalCode ?? "",
      STATUS_LABELS[c.status],
      String(c.jobs.length),
      lifetimeInvoiced.toFixed(2),
      totalPaid.toFixed(2),
      lastServiceDate ? lastServiceDate.toISOString().slice(0, 10) : "",
    ];
  });

  const csv = toCsv(
    [
      "Name",
      "Phone",
      "Email",
      "Address",
      "City",
      "Province",
      "Postal Code",
      "Status",
      "Job Count",
      "Lifetime Invoiced",
      "Total Paid",
      "Last Service Date",
    ],
    rows
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers.csv"`,
    },
  });
}
