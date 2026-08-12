import { z } from "zod";
import type { ExpenseCategory, PaymentMethod } from "@prisma/client";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  GOOGLE_LSA: "Google Local Services Ads",
  GAS: "Gas",
  EQUIPMENT: "Equipment",
  TOOLS: "Tools",
  SUPPLIES: "Supplies",
  VEHICLE: "Vehicle",
  INSURANCE: "Insurance",
  WEBSITE: "Website",
  HOSTING: "Hosting",
  SOFTWARE: "Software",
  PRINTING: "Printing",
  FLYERS: "Flyers",
  DOOR_HANGERS: "Door Hangers",
  YARD_SIGNS: "Yard Signs",
  SUBCONTRACTORS: "Subcontractors",
  PAYROLL: "Payroll",
  BANK_FEES: "Bank Fees",
  PHONE: "Phone",
  OTHER: "Other",
};

export const EXPENSE_CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  E_TRANSFER: "E-Transfer",
  CREDIT_CARD: "Credit Card",
  DEBIT: "Debit",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

function toOptionalNumber(v: unknown) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

export const expenseInputSchema = z.object({
  date: z.string().trim().min(1, "Date is required."),
  vendor: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  category: z.enum(EXPENSE_CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]], {
    message: "A valid category is required.",
  }),
  description: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  amountBeforeTax: z
    .union([z.number(), z.string()])
    .transform((v) => toOptionalNumber(v))
    .refine((v) => v !== undefined, "Amount before tax is required."),
  taxPaid: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => toOptionalNumber(v) ?? 0),
  paymentMethod: z
    .enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]])
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  receiptUrl: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  notes: z.string().trim().optional().transform((v) => (v ? v : undefined)),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export function serializeExpense<
  T extends { amountBeforeTax: unknown; taxPaid: unknown; total: unknown }
>(expense: T) {
  return {
    ...expense,
    amountBeforeTax: Number(expense.amountBeforeTax),
    taxPaid: Number(expense.taxPaid),
    total: Number(expense.total),
  };
}
