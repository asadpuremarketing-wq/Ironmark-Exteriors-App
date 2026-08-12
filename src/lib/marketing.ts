import { z } from "zod";
import type { MarketingPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PLATFORM_LABELS: Record<MarketingPlatform, string> = {
  META_ADS: "Meta Ads",
  FACEBOOK_MARKETPLACE: "Facebook Marketplace",
  GOOGLE_ADS: "Google Ads",
  GOOGLE_LSA: "Google Local Services Ads",
  FLYERS: "Flyers",
  DOOR_HANGERS: "Door Hangers",
  YARD_SIGNS: "Yard Signs",
  OTHER: "Other",
};

export const MARKETING_PLATFORMS = Object.keys(PLATFORM_LABELS) as MarketingPlatform[];

function toOptionalNumber(v: unknown) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

export const marketingSpendInputSchema = z.object({
  date: z.string().trim().min(1, "Date is required."),
  platform: z.enum(MARKETING_PLATFORMS as [MarketingPlatform, ...MarketingPlatform[]], {
    message: "A valid platform is required.",
  }),
  campaignName: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  amount: z
    .union([z.number(), z.string()])
    .transform((v) => toOptionalNumber(v))
    .refine((v) => v !== undefined, "Amount is required."),
  notes: z.string().trim().optional().transform((v) => (v ? v : undefined)),
});

export type MarketingSpendInput = z.infer<typeof marketingSpendInputSchema>;

export function serializeMarketingSpend<T extends { amount: unknown }>(spend: T) {
  return { ...spend, amount: Number(spend.amount) };
}

export type LeadSourcePerformance = {
  leadSource: string;
  leadCount: number;
  jobCount: number;
  conversionRate: number; // 0-100
  spend: number;
  revenue: number;
  cpl: number | null; // cost per lead
  cac: number | null; // customer acquisition cost (cost per booked job)
  roas: number | null; // revenue / spend
};

/**
 * Groups leads by Lead.leadSource and joins against Job (via lead) and
 * Invoice/Payment (via job) to compute conversion + spend efficiency
 * metrics per source. Invoice/Payment data doesn't exist yet in the UI
 * (Phase 2 stage 4+), so revenue/CAC/ROAS will read as 0/null until then
 * — that's expected, not a bug.
 */
export async function getLeadSourcePerformance(
  dateRange?: { start?: Date; end?: Date }
): Promise<LeadSourcePerformance[]> {
  const leadWhere = dateRange
    ? {
        dateReceived: {
          ...(dateRange.start ? { gte: dateRange.start } : {}),
          ...(dateRange.end ? { lte: dateRange.end } : {}),
        },
      }
    : {};

  const leads = await prisma.lead.findMany({
    where: leadWhere,
    select: {
      leadSource: true,
      job: {
        select: {
          id: true,
          invoice: {
            select: {
              total: true,
              payments: { select: { amount: true } },
            },
          },
        },
      },
    },
  });

  const spendWhere = dateRange
    ? {
        date: {
          ...(dateRange.start ? { gte: dateRange.start } : {}),
          ...(dateRange.end ? { lte: dateRange.end } : {}),
        },
      }
    : {};

  const spendRows = await prisma.marketingSpend.findMany({ where: spendWhere });

  // Spend is tracked per-platform, not per-lead-source. Sources map to a
  // platform 1:1 for the paid channels; organic/referral sources have no
  // associated spend (0), which is expected and correct.
  const spendByPlatform = new Map<string, number>();
  for (const row of spendRows) {
    spendByPlatform.set(row.platform, (spendByPlatform.get(row.platform) ?? 0) + Number(row.amount));
  }

  const sourceToPlatform: Record<string, MarketingPlatform | undefined> = {
    "Facebook Ads": "META_ADS",
    "Facebook Marketplace": "FACEBOOK_MARKETPLACE",
    "Google Ads": "GOOGLE_ADS",
    "Google Local Services Ads": "GOOGLE_LSA",
    "Door Hanger": "DOOR_HANGERS",
    Flyer: "FLYERS",
    "Yard Sign": "YARD_SIGNS",
  };

  const grouped = new Map<
    string,
    { leadCount: number; jobCount: number; revenue: number }
  >();

  for (const lead of leads) {
    const key = lead.leadSource;
    const entry = grouped.get(key) ?? { leadCount: 0, jobCount: 0, revenue: 0 };
    entry.leadCount += 1;
    if (lead.job) {
      entry.jobCount += 1;
      if (lead.job.invoice) {
        const paid = lead.job.invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        entry.revenue += paid;
      }
    }
    grouped.set(key, entry);
  }

  const results: LeadSourcePerformance[] = [];
  for (const [leadSource, entry] of grouped) {
    const platform = sourceToPlatform[leadSource];
    const spend = platform ? spendByPlatform.get(platform) ?? 0 : 0;
    const conversionRate = entry.leadCount > 0 ? (entry.jobCount / entry.leadCount) * 100 : 0;

    results.push({
      leadSource,
      leadCount: entry.leadCount,
      jobCount: entry.jobCount,
      conversionRate,
      spend,
      revenue: entry.revenue,
      cpl: spend > 0 && entry.leadCount > 0 ? spend / entry.leadCount : null,
      cac: spend > 0 && entry.jobCount > 0 ? spend / entry.jobCount : null,
      roas: spend > 0 ? entry.revenue / spend : null,
    });
  }

  results.sort((a, b) => b.leadCount - a.leadCount);
  return results;
}
