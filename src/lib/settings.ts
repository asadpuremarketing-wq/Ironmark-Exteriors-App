import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PROVINCES } from "@/lib/customers";

const SINGLETON_ID = "singleton";

export const businessSettingsInputSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required.").default("Ironmark Exteriors"),
  logoUrl: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  phone: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  email: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  website: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  address: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  city: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  province: z.string().trim().min(1).default("Ontario"),
  postalCode: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  taxNumber: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  defaultTaxLabel: z.string().trim().min(1, "Default tax label is required.").default("13% HST"),
  defaultTaxRate: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return 13;
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) ? n : 13;
    }),
  invoiceFooterMessage: z.string().trim().optional().transform((v) => (v ? v : undefined)),
});

export type BusinessSettingsInput = z.infer<typeof businessSettingsInputSchema>;

export { PROVINCES };

/**
 * Fetches the single business settings row, lazily creating it with
 * defaults on first read (mirrors the "singleton by fixed id" pattern —
 * there is exactly one row, keyed by a well-known id, upserted on demand).
 */
export async function getBusinessSettings() {
  return prisma.businessSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
}

export function serializeBusinessSettings<T extends { defaultTaxRate: unknown }>(settings: T) {
  return {
    ...settings,
    defaultTaxRate: Number(settings.defaultTaxRate),
  };
}
