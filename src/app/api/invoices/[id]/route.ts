import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  invoiceInputSchema,
  computeInvoiceTotals,
  deriveInvoiceStatus,
  serializeInvoice,
} from "@/lib/invoices";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, job: true, payments: { orderBy: { paymentDate: "desc" } } },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  return NextResponse.json({ invoice: serializeInvoice(invoice) });
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = invoiceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const data = parsed.data;

  const taxLabel = data.taxLabel ?? existing.taxLabel;
  const taxRate = data.taxRate ?? Number(existing.taxRate);

  const { subtotal, taxAmount, total } = computeInvoiceTotals({
    quantity: data.quantity,
    unitPrice: data.unitPrice!,
    discount: data.discount,
    taxRate,
  });

  const paymentsSum = existing.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const manualStatus = data.status ?? existing.status;
  const nextStatus = deriveInvoiceStatus(
    { status: manualStatus, total, dueDate: data.dueDate ? new Date(data.dueDate) : existing.dueDate },
    paymentsSum
  );

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      customerId: data.customerId,
      jobId: data.jobId ?? existing.jobId,
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : existing.invoiceDate,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      description: data.description,
      quantity: data.quantity,
      unitPrice: data.unitPrice!,
      subtotal,
      discount: data.discount ?? 0,
      taxLabel,
      taxRate,
      taxAmount,
      total,
      notes: data.notes ?? null,
      status: nextStatus,
    },
    include: { customer: true, job: true, payments: { orderBy: { paymentDate: "desc" } } },
  });

  return NextResponse.json({ invoice: serializeInvoice(invoice) });
}
