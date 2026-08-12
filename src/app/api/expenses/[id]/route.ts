import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { expenseInputSchema, serializeExpense } from "@/lib/expenses";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  }

  return NextResponse.json({ expense: serializeExpense(expense) });
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

  const parsed = expenseInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  }

  const data = parsed.data;
  const total = data.amountBeforeTax! + (data.taxPaid ?? 0);

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      date: new Date(data.date),
      vendor: data.vendor ?? null,
      category: data.category,
      description: data.description ?? null,
      amountBeforeTax: data.amountBeforeTax!,
      taxPaid: data.taxPaid ?? 0,
      total,
      paymentMethod: data.paymentMethod ?? null,
      receiptUrl: data.receiptUrl ?? null,
      notes: data.notes ?? null,
    },
  });

  return NextResponse.json({ expense: serializeExpense(expense) });
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Archiving is a soft delete — sets archivedAt instead of removing the
  // row, so historical financial records are preserved.
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "You do not have permission to archive expenses." },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  }

  await prisma.expense.update({ where: { id }, data: { archivedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
