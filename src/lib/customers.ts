import { z } from "zod";
import type { CustomerStatus } from "@prisma/client";

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
  LEAD: "bg-brand-electric/10 text-brand-electric",
  ACTIVE_CUSTOMER: "bg-green-100 text-green-700",
  PAST_CUSTOMER: "bg-ink-900/10 text-ink-900/60",
  DO_NOT_CONTACT: "bg-red-100 text-red-700",
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
