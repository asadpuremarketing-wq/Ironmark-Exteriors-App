import { z } from "zod";
import type { MarketingPlatform, ExpenseCategory } from "@prisma/client";
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

// Sources with a real spend-tracked platform behind them (i.e. you'd log a
// Marketing Spend entry for it) — as opposed to Referral, Organic Google,
// Returning Customer, "Unknown" (legacy jobs from before source tracking),
// or Other, which have no ad spend to attribute.
export const SOURCE_TO_PLATFORM: Record<string, MarketingPlatform | undefined> = {
  "Facebook Ads": "META_ADS",
  "Facebook Marketplace": "FACEBOOK_MARKETPLACE",
  "Google Ads": "GOOGLE_ADS",
  "Google Local Services Ads": "GOOGLE_LSA",
  "Door Hanger": "DOOR_HANGERS",
  Flyer: "FLYERS",
  "Yard Sign": "YARD_SIGNS",
};

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
  cac: number | null; // cost per job booked = spend / jobCount
  roas: number | null; // revenue / spend
};

/**
 * Groups Leads by leadSource (for lead counts / conversion rate) and Jobs
 * by bookingSource (for job counts / revenue / CAC) to compute per-source
 * spend efficiency. Jobs use their own bookingSource rather than only
 * leads that got converted — every job has a source, whether it came from
 * a tracked lead (bookingSource copied from the lead at booking time) or
 * was created directly. Jobs from before bookingSource existed fall back
 * to their linked lead's source, then "Unknown" if neither is available.
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

  const jobWhere = dateRange
    ? {
        scheduledDate: {
          ...(dateRange.start ? { gte: dateRange.start } : {}),
          ...(dateRange.end ? { lte: dateRange.end } : {}),
        },
      }
    : {};

  const spendWhere = dateRange
    ? {
        date: {
          ...(dateRange.start ? { gte: dateRange.start } : {}),
          ...(dateRange.end ? { lte: dateRange.end } : {}),
        },
      }
    : {};

  // ExpenseCategory and MarketingPlatform share identical values for the ad
  // categories (META_ADS, GOOGLE_ADS, GOOGLE_LSA, FLYERS, DOOR_HANGERS,
  // YARD_SIGNS), so an ad spend logged either as a dedicated Marketing
  // Spend entry OR as a regular Expense with one of those categories both
  // count — people naturally log recurring ad spend through Expenses
  // (where receipts/tax tracking already lives) rather than a separate
  // Marketing page, and this shouldn't silently miss that money.
  const adExpenseCategories: ExpenseCategory[] = [
    "META_ADS",
    "GOOGLE_ADS",
    "GOOGLE_LSA",
    "FLYERS",
    "DOOR_HANGERS",
    "YARD_SIGNS",
  ];

  const [leads, jobs, spendRows, adExpenseRows] = await Promise.all([
    prisma.lead.findMany({ where: leadWhere, select: { leadSource: true } }),
    prisma.job.findMany({
      where: jobWhere,
      select: {
        bookingSource: true,
        lead: { select: { leadSource: true } },
        invoice: { select: { payments: { select: { amount: true } } } },
      },
    }),
    prisma.marketingSpend.findMany({ where: spendWhere }),
    prisma.expense.findMany({
      where: { ...spendWhere, archivedAt: null, category: { in: adExpenseCategories } },
      select: { category: true, total: true },
    }),
  ]);

  // Spend is tracked per-platform, not per-lead-source. Sources map to a
  // platform 1:1 for the paid channels; organic/referral sources have no
  // associated spend (0), which is expected and correct.
  const spendByPlatform = new Map<string, number>();
  for (const row of spendRows) {
    spendByPlatform.set(row.platform, (spendByPlatform.get(row.platform) ?? 0) + Number(row.amount));
  }
  for (const row of adExpenseRows) {
    spendByPlatform.set(row.category, (spendByPlatform.get(row.category) ?? 0) + Number(row.total));
  }

  const grouped = new Map<
    string,
    { leadCount: number; jobCount: number; revenue: number }
  >();

  function entryFor(key: string) {
    const entry = grouped.get(key) ?? { leadCount: 0, jobCount: 0, revenue: 0 };
    grouped.set(key, entry);
    return entry;
  }

  for (const lead of leads) {
    entryFor(lead.leadSource).leadCount += 1;
  }

  for (const job of jobs) {
    const source = job.bookingSource ?? job.lead?.leadSource ?? "Unknown";
    const entry = entryFor(source);
    entry.jobCount += 1;
    if (job.invoice) {
      entry.revenue += job.invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    }
  }

  const results: LeadSourcePerformance[] = [];
  for (const [leadSource, entry] of grouped) {
    const platform = SOURCE_TO_PLATFORM[leadSource];
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

  results.sort((a, b) => b.jobCount - a.jobCount || b.leadCount - a.leadCount);
  return results;
}

export type AdSpendSummary = {
  spend: number;
  jobCount: number;
  revenue: number;
  costPerJob: number | null;
};

/**
 * Blends every paid ad source (Meta Ads, Google Ads, Google LSA, Facebook
 * Marketplace, Door Hanger, Flyer, Yard Sign — anything with a real
 * MarketingSpend platform behind it) into one number: total spend across
 * those sources ÷ total jobs booked from those sources. Deliberately
 * excludes Referral, Organic Google, Returning Customer, Other, and
 * "Unknown" (legacy jobs from before source tracking existed) — those have
 * no ad spend to attribute, and mixing their revenue/job counts in would
 * understate the real cost of the ads you're actually paying for.
 */
export function summarizeAdSpend(rows: LeadSourcePerformance[]): AdSpendSummary {
  const adRows = rows.filter((r) => SOURCE_TO_PLATFORM[r.leadSource] !== undefined);
  const spend = adRows.reduce((sum, r) => sum + r.spend, 0);
  const jobCount = adRows.reduce((sum, r) => sum + r.jobCount, 0);
  const revenue = adRows.reduce((sum, r) => sum + r.revenue, 0);
  return {
    spend,
    jobCount,
    revenue,
    costPerJob: spend > 0 && jobCount > 0 ? spend / jobCount : null,
  };
}
