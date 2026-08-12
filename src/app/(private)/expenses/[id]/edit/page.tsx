import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ExpenseForm from "@/components/expenses/ExpenseForm";

type Params = Promise<{ id: string }>;

export default async function EditExpensePage({ params }: { params: Params }) {
  const { id } = await params;
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/expenses" className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
        ← Back to Expenses
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">Edit Expense</h1>

      <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <ExpenseForm
          mode="edit"
          initialValues={{
            id: expense.id,
            date: new Date(expense.date).toISOString().slice(0, 10),
            vendor: expense.vendor ?? "",
            category: expense.category,
            description: expense.description ?? "",
            amountBeforeTax: String(expense.amountBeforeTax),
            taxPaid: String(expense.taxPaid),
            paymentMethod: expense.paymentMethod ?? "",
            receiptUrl: expense.receiptUrl ?? "",
            notes: expense.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
