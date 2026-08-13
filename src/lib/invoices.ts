import { z } from "zod";
import type { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-ink-900/5 text-ink-900/60 ring-1 ring-inset ring-ink-900/10",
  PENDING: "bg-brand-electric/10 text-brand-electric ring-1 ring-inset ring-brand-electric/20",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  PAID: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  OVERDUE: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
  CANCELLED: "bg-ink-900/5 text-ink-900/40 ring-1 ring-inset ring-ink-900/10",
  REFUNDED: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20",
};

export const INVOICE_STATUSES = Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[];

function toOptionalNumber(v: unknown) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

export const invoiceInputSchema = z.object({
  customerId: z.string().min(1, "A customer is required."),
  jobId: z.string().optional().transform((v) => (v ? v : undefined)),
  invoiceDate: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  dueDate: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  description: z.string().trim().min(1, "Description is required."),
  quantity: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => toOptionalNumber(v) ?? 1),
  unitPrice: z
    .union([z.number(), z.string()])
    .transform((v) => toOptionalNumber(v))
    .refine((v) => v !== undefined, "Unit price is required."),
  discount: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => toOptionalNumber(v) ?? 0),
  taxLabel: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  taxRate: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => toOptionalNumber(v)),
  notes: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  status: z.enum(["DRAFT", "PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"]).optional(),
});

export type InvoiceInput = z.infer<typeof invoiceInputSchema>;

/**
 * Generates the next sequential invoice number for the current calendar
 * year, formatted as INV-YYYY-NNNN (e.g. INV-2026-0001). Runs inside the
 * same transaction as invoice creation to avoid two simultaneous requests
 * handing out the same number — mirrors generateJobNumber in src/lib/jobs.ts.
 */
export async function generateInvoiceNumber(
  tx: Pick<typeof prisma, "invoice">,
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `INV-${year}-`;

  const last = await tx.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  const lastSeq = last ? parseInt(last.invoiceNumber.slice(prefix.length), 10) : 0;
  const nextSeq = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

/**
 * Computes subtotal/taxAmount/total from quantity, unitPrice, discount and
 * taxRate. Rounds to the nearest cent at each stage to avoid floating
 * point drift. e.g. quantity 1, unitPrice 200, taxRate 13 => subtotal 200,
 * taxAmount 26, total 226.
 */
export function computeInvoiceTotals({
  quantity,
  unitPrice,
  discount = 0,
  taxRate = 0,
}: {
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}) {
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  const rawSubtotal = quantity * unitPrice - discount;
  const subtotal = round2(Math.max(0, rawSubtotal));
  const taxAmount = round2(subtotal * (taxRate / 100));
  const total = round2(subtotal + taxAmount);

  return { subtotal, taxAmount, total };
}

/**
 * Derives the correct invoice status from its stored status, due date, and
 * the sum of its payments. Terminal/manual statuses (CANCELLED, REFUNDED,
 * DRAFT) are left untouched — only PENDING/PARTIALLY_PAID/PAID/OVERDUE are
 * computed from payments.
 */
export function deriveInvoiceStatus(
  invoice: { status: InvoiceStatus; total: number; dueDate: Date | string | null },
  paymentsSum: number
): InvoiceStatus {
  if (invoice.status === "DRAFT" || invoice.status === "CANCELLED" || invoice.status === "REFUNDED") {
    return invoice.status;
  }

  if (paymentsSum >= invoice.total && invoice.total > 0) {
    return "PAID";
  }

  if (paymentsSum > 0) {
    return "PARTIALLY_PAID";
  }

  if (invoice.dueDate && new Date(invoice.dueDate).getTime() < Date.now()) {
    return "OVERDUE";
  }

  return "PENDING";
}

export function serializeInvoice<
  T extends {
    quantity: unknown;
    unitPrice: unknown;
    subtotal: unknown;
    discount: unknown;
    taxRate: unknown;
    taxAmount: unknown;
    total: unknown;
    payments: { amount: unknown }[];
    job?: { quotedPrice: unknown; finalPrice: unknown } | null;
  }
>(invoice: T) {
  return {
    ...invoice,
    quantity: Number(invoice.quantity),
    unitPrice: Number(invoice.unitPrice),
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount),
    taxRate: Number(invoice.taxRate),
    taxAmount: Number(invoice.taxAmount),
    total: Number(invoice.total),
    payments: invoice.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    job: invoice.job
      ? {
          ...invoice.job,
          quotedPrice: invoice.job.quotedPrice === null ? null : Number(invoice.job.quotedPrice),
          finalPrice: invoice.job.finalPrice === null ? null : Number(invoice.job.finalPrice),
        }
      : invoice.job,
  };
}
