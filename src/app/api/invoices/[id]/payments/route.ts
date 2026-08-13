import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { paymentInputSchema, serializePayment } from "@/lib/payments";
import { deriveInvoiceStatus, serializeInvoice } from "@/lib/invoices";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const payments = await prisma.payment.findMany({
    where: { invoiceId: id },
    orderBy: { paymentDate: "desc" },
  });

  return NextResponse.json({ payments: payments.map(serializePayment) });
}

export async function POST(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Payments are financial audit-trail records — only Owner/Admin can add
  // them, and they can never be edited or deleted once created.
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "You do not have permission to record payments." },
      { status: 403 }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = paymentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const currentPaid = existing.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(existing.total) - currentPaid;

  if (data.amount! > remaining && !data.overrideLimit) {
    return NextResponse.json(
      {
        error: `Payment of $${data.amount!.toFixed(2)} exceeds the remaining balance of $${remaining.toFixed(2)}.`,
        remaining,
        requiresOverride: true,
      },
      { status: 409 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId: id,
        customerId: existing.customerId,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        amount: data.amount!,
        method: data.method,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
      },
    });

    const newPaymentsSum = currentPaid + data.amount!;
    const nextStatus = deriveInvoiceStatus(
      { status: existing.status, total: Number(existing.total), dueDate: existing.dueDate },
      newPaymentsSum
    );

    const invoice = await tx.invoice.update({
      where: { id },
      data: { status: nextStatus },
      include: { customer: true, job: true, payments: { orderBy: { paymentDate: "desc" } } },
    });

    return { payment, invoice };
  });

  return NextResponse.json(
    { payment: serializePayment(result.payment), invoice: serializeInvoice(result.invoice) },
    { status: 201 }
  );
}
