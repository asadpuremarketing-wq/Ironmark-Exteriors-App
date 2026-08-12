import { NextResponse } from "next/server";
import type { Prisma, ExpenseCategory } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { expenseInputSchema, serializeExpense, EXPENSE_CATEGORIES } from "@/lib/expenses";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();
  const startDate = searchParams.get("startDate")?.trim();
  const endDate = searchParams.get("endDate")?.trim();
  const includeArchived = searchParams.get("includeArchived") === "true";

  const and: Prisma.ExpenseWhereInput[] = [];

  if (!includeArchived) {
    and.push({ archivedAt: null });
  }

  if (q) {
    and.push({
      OR: [
        { vendor: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (category && EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
    and.push({ category: category as ExpenseCategory });
  }

  if (startDate || endDate) {
    const range: Prisma.DateTimeFilter = {};
    if (startDate) range.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) range.lte = new Date(`${endDate}T23:59:59.999Z`);
    and.push({ date: range });
  }

  const expenses = await prisma.expense.findMany({
    where: and.length > 0 ? { AND: and } : undefined,
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ expenses: expenses.map(serializeExpense) });
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

  const parsed = expenseInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const total = data.amountBeforeTax! + (data.taxPaid ?? 0);

  const expense = await prisma.expense.create({
    data: {
      date: new Date(data.date),
      vendor: data.vendor,
      category: data.category,
      description: data.description,
      amountBeforeTax: data.amountBeforeTax!,
      taxPaid: data.taxPaid ?? 0,
      total,
      paymentMethod: data.paymentMethod,
      receiptUrl: data.receiptUrl,
      notes: data.notes,
    },
  });

  return NextResponse.json({ expense: serializeExpense(expense) }, { status: 201 });
}
