import { NextResponse } from "next/server";
import type { Prisma, InvoiceStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  invoiceInputSchema,
  generateInvoiceNumber,
  computeInvoiceTotals,
  serializeInvoice,
  INVOICE_STATUSES,
} from "@/lib/invoices";
import { getBusinessSettings } from "@/lib/settings";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status")?.trim();
  const customerId = searchParams.get("customerId")?.trim();
  const includeArchived = searchParams.get("includeArchived") === "true";

  const and: Prisma.InvoiceWhereInput[] = [];

  if (!includeArchived) {
    and.push({ archivedAt: null });
  }

  if (q) {
    and.push({
      OR: [
        { invoiceNumber: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { customer: { firstName: { contains: q, mode: "insensitive" } } },
        { customer: { lastName: { contains: q, mode: "insensitive" } } },
        { customer: { phone: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  if (status && INVOICE_STATUSES.includes(status as InvoiceStatus)) {
    and.push({ status: status as InvoiceStatus });
  }

  if (customerId) and.push({ customerId });

  const invoices = await prisma.invoice.findMany({
    where: and.length > 0 ? { AND: and } : undefined,
    include: { customer: true, job: true, payments: true },
    orderBy: { invoiceDate: "desc" },
  });

  return NextResponse.json({ invoices: invoices.map(serializeInvoice) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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

  const data = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) {
    return NextResponse.json({ error: "Selected customer does not exist." }, { status: 400 });
  }

  if (data.jobId) {
    const existingInvoiceForJob = await prisma.invoice.findUnique({ where: { jobId: data.jobId } });
    if (existingInvoiceForJob) {
      return NextResponse.json(
        {
          error: "This job already has an invoice.",
          existingInvoiceId: existingInvoiceForJob.id,
        },
        { status: 409 }
      );
    }
  }

  const settings = await getBusinessSettings();
  const taxLabel = data.taxLabel ?? settings.defaultTaxLabel;
  const taxRate = data.taxRate ?? Number(settings.defaultTaxRate);

  const { subtotal, taxAmount, total } = computeInvoiceTotals({
    quantity: data.quantity,
    unitPrice: data.unitPrice!,
    discount: data.discount,
    taxRate,
  });

  const status = data.status ?? "PENDING";

  const invoice = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber(tx);
    return tx.invoice.create({
      data: {
        invoiceNumber,
        customerId: data.customerId,
        jobId: data.jobId,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
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
        notes: data.notes,
        status,
      },
      include: { customer: true, job: true, payments: true },
    });
  });

  return NextResponse.json({ invoice: serializeInvoice(invoice) }, { status: 201 });
}
