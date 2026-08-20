import { z } from "zod";
import type { LeadStatus } from "@prisma/client";

// Kept as a plain, curated list (not a DB enum) so new sources can be
// added here later without a database migration.
export const LEAD_SOURCES = [
  "Meta Ads",
  "Facebook Marketplace",
  "Google Ads",
  "Google Local Services Ads",
  "Google Business Profile",
  "Organic Google",
  "Referral",
  "Returning Customer",
  "Door Hanger",
  "Flyer",
  "Yard Sign",
  "Other",
] as const;

export const SERVICES = [
  "Roofing",
  "Siding",
  "Gutters",
  "Windows",
  "Painting",
  "Pressure Washing",
  "Other",
] as const;

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTE_NEEDED: "Quote Needed",
  QUOTE_SENT: "Quote Sent",
  FOLLOW_UP: "Follow Up",
  BOOKED: "Booked",
  LOST: "Lost",
  NO_RESPONSE: "No Response",
};

export const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-brand-electric/10 text-brand-electric ring-1 ring-inset ring-brand-electric/20",
  CONTACTED: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-600/20",
  QUOTE_NEEDED: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  QUOTE_SENT: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20",
  FOLLOW_UP: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20",
  BOOKED: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  LOST: "bg-ink-900/5 text-ink-900/50 ring-1 ring-inset ring-ink-900/10",
  NO_RESPONSE: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
};

export const LEAD_STATUSES = Object.keys(STATUS_LABELS) as LeadStatus[];

export const leadInputSchema = z.object({
  customerId: z.string().min(1, "A customer is required."),
  serviceRequested: z.string().trim().min(1, "Service requested is required."),
  leadSource: z.string().trim().min(1, "Lead source is required."),
  estimatedValue: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return undefined;
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) ? n : undefined;
    }),
  status: z
    .enum(["NEW", "CONTACTED", "QUOTE_NEEDED", "QUOTE_SENT", "FOLLOW_UP", "BOOKED", "LOST", "NO_RESPONSE"])
    .optional(),
  dateReceived: z.string().trim().optional(),
  followUpDate: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v ? v : undefined)),
  notes: z.string().trim().optional().transform((v) => (v ? v : undefined)),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

// Follow-up dates are stored as date-only values (parsed from a plain
// YYYY-MM-DD form input, which JS interprets as UTC midnight). Reading them
// back with UTC getters reproduces the exact calendar date the user picked,
// regardless of the server's local timezone — so we key on that.
function storedDateKey(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

// "Today" is evaluated in the business's local timezone (Ontario), not the
// server's, so the due/overdue cutoff lines up with the actual local day
// even when this runs on a UTC server (e.g. Vercel).
function todayKeyInBusinessTimezone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // en-CA formats as YYYY-MM-DD
}

export function isOverdue(followUpDate: Date | string | null) {
  if (!followUpDate) return false;
  return storedDateKey(followUpDate) < todayKeyInBusinessTimezone();
}

export function isDueToday(followUpDate: Date | string | null) {
  if (!followUpDate) return false;
  return storedDateKey(followUpDate) === todayKeyInBusinessTimezone();
}

// For DB-level queries (e.g. counting follow-ups due for the dashboard).
// Since follow-up dates are always stored as UTC midnight of the picked
// calendar date, "due today or earlier" is everything <= the UTC end of
// today's business-timezone date.
export function followUpDueBoundary() {
  return new Date(`${todayKeyInBusinessTimezone()}T23:59:59.999Z`);
}
