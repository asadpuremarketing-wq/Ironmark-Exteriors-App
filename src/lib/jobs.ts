import { z } from "zod";
import type { JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const STATUS_LABELS: Record<JobStatus, string> = {
  BOOKED: "Booked",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
};

export const STATUS_STYLES: Record<JobStatus, string> = {
  BOOKED: "bg-brand-electric/10 text-brand-electric ring-1 ring-inset ring-brand-electric/20",
  CONFIRMED: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  COMPLETED: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  CANCELLED: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
  RESCHEDULED: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20",
};

export const JOB_STATUSES = Object.keys(STATUS_LABELS) as JobStatus[];

export const jobInputSchema = z.object({
  customerId: z.string().min(1, "A customer is required."),
  leadId: z.string().optional().transform((v) => (v ? v : undefined)),
  service: z.string().trim().min(1, "Service is required."),
  serviceAddress: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  city: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  province: z.string().trim().min(1).default("Ontario"),
  postalCode: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  scheduledDate: z.string().trim().min(1, "Scheduled date is required."),
  startTime: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  estimatedDuration: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  quotedPrice: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) ? n : undefined;
    }),
  finalPrice: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) ? n : undefined;
    }),
  status: z
    .enum(["BOOKED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "RESCHEDULED"])
    .optional(),
  notes: z.string().trim().optional().transform((v) => (v ? v : undefined)),
});

export type JobInput = z.infer<typeof jobInputSchema>;

/**
 * Generates the next sequential job number for the current calendar year,
 * formatted as IME-YYYY-NNNN (e.g. IME-2026-0001). Runs inside the same
 * transaction as job creation to avoid two simultaneous requests handing
 * out the same number.
 */
export async function generateJobNumber(
  tx: Pick<typeof prisma, "job">,
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `IME-${year}-`;

  const last = await tx.job.findFirst({
    where: { jobNumber: { startsWith: prefix } },
    orderBy: { jobNumber: "desc" },
    select: { jobNumber: true },
  });

  const lastSeq = last ? parseInt(last.jobNumber.slice(prefix.length), 10) : 0;
  const nextSeq = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

// "Today" is evaluated in the business's local timezone (Ontario), not the
// server's, so job scheduling lines up with the actual local day even when
// this runs on a UTC server (e.g. Vercel). Mirrors the same approach used
// for lead follow-up dates in src/lib/leads.ts.
function todayKeyInBusinessTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isToday(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10) === todayKeyInBusinessTimezone();
}

export function isUpcoming(date: Date | string, status: JobStatus) {
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  return new Date(date).toISOString().slice(0, 10) >= todayKeyInBusinessTimezone();
}

/** UTC start/end boundaries for "today" (business timezone), for DB queries. */
export function todayDateRangeUTC() {
  const todayKey = todayKeyInBusinessTimezone();
  return {
    start: new Date(`${todayKey}T00:00:00.000Z`),
    end: new Date(`${todayKey}T23:59:59.999Z`),
  };
}
