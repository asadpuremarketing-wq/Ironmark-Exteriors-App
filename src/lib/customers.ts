import { z } from "zod";
import type { CustomerStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PROVINCES = [
  "Ontario",
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
] as const;

export const STATUS_LABELS: Record<CustomerStatus, string> = {
  LEAD: "Lead",
  ACTIVE_CUSTOMER: "Active Customer",
  PAST_CUSTOMER: "Past Customer",
  DO_NOT_CONTACT: "Do Not Contact",
};

export const STATUS_STYLES: Record<CustomerStatus, string> = {
  LEAD: "bg-brand-electric/10 text-brand-electric ring-1 ring-inset ring-brand-electric/20",
  ACTIVE_CUSTOMER: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  PAST_CUSTOMER: "bg-ink-900/5 text-ink-900/60 ring-1 ring-inset ring-ink-900/10",
  DO_NOT_CONTACT: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
};

export const customerInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  phone: z.string().trim().min(7, "A valid phone number is required."),
  email: z
    .union([z.string().trim().email("Enter a valid email address."), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  streetAddress: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  city: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  province: z.string().trim().min(1).default("Ontario"),
  postalCode: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  notes: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  status: z.enum(["LEAD", "ACTIVE_CUSTOMER", "PAST_CUSTOMER", "DO_NOT_CONTACT"]).optional(),
  emailMarketingConsent: z.boolean().optional(),
  smsMarketingConsent: z.boolean().optional(),
  doNotContact: z.boolean().optional(),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;

export function customerFullName(c: { firstName: string; lastName: string }) {
  return `${c.firstName} ${c.lastName}`.trim();
}

export type CustomerLifetimeValue = {
  totalJobs: number;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  lastServiceDate: Date | null;
};

/**
 * Single source of truth for a customer's lifetime-value figures — reused by
 * both the customer profile page and the Past Customers list so the numbers
 * never drift out of sync between the two views.
 */
export async function getCustomerLifetimeValue(customerId: string): Promise<CustomerLifetimeValue> {
  const [jobs, invoices] = await Promise.all([
    prisma.job.findMany({
      where: { customerId },
      select: { status: true, scheduledDate: true },
    }),
    prisma.invoice.findMany({
      where: { customerId, archivedAt: null },
      include: { payments: { select: { amount: true } } },
    }),
  ]);

  const totalJobs = jobs.length;

  const completedDates = jobs
    .filter((j) => j.status === "COMPLETED")
    .map((j) => j.scheduledDate)
    .sort((a, b) => b.getTime() - a.getTime());
  const lastServiceDate = completedDates[0] ?? null;

  const billable = invoices.filter((inv) => inv.status !== "CANCELLED" && inv.status !== "REFUNDED");
  const totalInvoiced = billable.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + inv.payments.reduce((s, p) => s + Number(p.amount), 0),
    0
  );
  const outstandingBalance = billable.reduce((sum, inv) => {
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    return sum + Math.max(0, Number(inv.total) - paid);
  }, 0);

  return { totalJobs, totalInvoiced, totalPaid, outstandingBalance, lastServiceDate };
}
