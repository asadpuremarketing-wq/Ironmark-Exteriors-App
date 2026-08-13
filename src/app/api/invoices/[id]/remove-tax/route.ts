import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deriveInvoiceStatus, serializeInvoice } from "@/lib/invoices";

type Params = Promise<{ id: string }>;

/**
 * Zeroes out tax on an invoice (e.g. a cash job where no tax is being
 * collected) without requiring the caller to resend the full invoice
 * payload — recomputes total from the invoice's own stored subtotal.
 */
export async function POST(_request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "You do not have permission to change invoice tax." },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const total = Number(existing.subtotal);
  const paymentsSum = existing.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const nextStatus = deriveInvoiceStatus(
    { status: existing.status, total, dueDate: existing.dueDate },
    paymentsSum
  );

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      taxLabel: "No Tax",
      taxRate: 0,
      taxAmount: 0,
      total,
      status: nextStatus,
    },
    include: { customer: true, job: true, payments: { orderBy: { paymentDate: "desc" } } },
  });

  return NextResponse.json({ invoice: serializeInvoice(invoice) });
}
