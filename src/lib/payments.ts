import { z } from "zod";
import type { PaymentMethod } from "@prisma/client";

export { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/expenses";

function toOptionalNumber(v: unknown) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

export const paymentInputSchema = z.object({
  amount: z
    .union([z.number(), z.string()])
    .transform((v) => toOptionalNumber(v))
    .refine((v) => v !== undefined && v > 0, "A positive payment amount is required."),
  method: z.enum(["CASH", "E_TRANSFER", "CREDIT_CARD", "DEBIT", "CHEQUE", "OTHER"], {
    message: "A valid payment method is required.",
  }),
  paymentDate: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  referenceNumber: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  notes: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  overrideLimit: z.boolean().optional().default(false),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

export function serializePayment<T extends { amount: unknown }>(payment: T) {
  return { ...payment, amount: Number(payment.amount) };
}

export type { PaymentMethod };
