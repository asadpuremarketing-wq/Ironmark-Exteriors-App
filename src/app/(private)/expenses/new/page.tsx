import Link from "next/link";
import ExpenseForm from "@/components/expenses/ExpenseForm";

export default function NewExpensePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/expenses" className="text-sm font-medium text-ink-900/50 hover:text-ink-900">
        ← Back to Expenses
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">Add Expense</h1>

      <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <ExpenseForm mode="create" />
      </div>
    </div>
  );
}
