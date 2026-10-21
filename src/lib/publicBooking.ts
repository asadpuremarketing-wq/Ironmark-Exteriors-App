import { z } from "zod";

/**
 * Services bookable directly from the public marketing site
 * (ironmarkexteriors.ca). Only services with upfront/fixed pricing belong
 * here — quote-based services (roofing, siding repair, etc.) are never
 * self-booked. The `service` value here is what's written into Job.service,
 * so it must read well on its own in the App's job list/calendar.
 */
export const PUBLIC_BOOKABLE_SERVICES = {
  "gutter-cleaning": "Gutter Cleaning",
  "window-cleaning": "Window Cleaning",
  "pressure-washing": "Pressure Washing",
} as const;

export type PublicBookableServiceSlug = keyof typeof PUBLIC_BOOKABLE_SERVICES;

export function isPublicBookableService(slug: string): slug is PublicBookableServiceSlug {
  return Object.prototype.hasOwnProperty.call(PUBLIC_BOOKABLE_SERVICES, slug);
}

/**
 * Fixed 2-hour slot grid, 8am-6pm. Every booking occupies one of these
 * blocks regardless of how long the job actually takes — this is what
 * guarantees the required 2-hour gap between jobs without needing a
 * separate per-service duration model.
 */
export const BOOKING_SLOTS: { startTime: string; endTime: string; label: string }[] = [
  { startTime: "08:00", endTime: "10:00", label: "8:00 AM – 10:00 AM" },
  { startTime: "10:00", endTime: "12:00", label: "10:00 AM – 12:00 PM" },
  { startTime: "12:00", endTime: "14:00", label: "12:00 PM – 2:00 PM" },
  { startTime: "14:00", endTime: "16:00", label: "2:00 PM – 4:00 PM" },
  { startTime: "16:00", endTime: "18:00", label: "4:00 PM – 6:00 PM" },
];

// Monday-Saturday, no Sunday. JS Date#getDay(): 0=Sun..6=Sat.
export const BOOKABLE_WEEKDAYS = [1, 2, 3, 4, 5, 6];

export const MIN_LEAD_DAYS = 1; // no same-day booking
export const MAX_ADVANCE_DAYS = 60;

const BUSINESS_TIMEZONE = "America/Toronto";

/** "YYYY-MM-DD" for "today" in the business's local timezone. */
export function todayKeyInBusinessTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Day of week (0=Sun..6=Sat) for a "YYYY-MM-DD" key, independent of server timezone. */
function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Whether `dateKey` ("YYYY-MM-DD") is a date customers are allowed to book. */
export function isBookableDate(dateKey: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const today = todayKeyInBusinessTimezone();
  const earliest = addDays(today, MIN_LEAD_DAYS);
  const latest = addDays(today, MAX_ADVANCE_DAYS);
  if (dateKey < earliest || dateKey > latest) return false;
  return BOOKABLE_WEEKDAYS.includes(weekdayOf(dateKey));
}

export function isBookableSlot(startTime: string): boolean {
  return BOOKING_SLOTS.some((s) => s.startTime === startTime);
}

export const publicBookingInputSchema = z.object({
  service: z.string().refine(isPublicBookableService, "Unknown or unbookable service."),
  date: z.string().refine(isBookableDate, "That date is not available for booking."),
  startTime: z.string().refine(isBookableSlot, "That time slot is not available."),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 7, "Enter a valid phone number."),
  streetAddress: z.string().trim().min(1, "Service address is required."),
  city: z.string().trim().min(1, "City is required."),
  postalCode: z.string().trim().optional().transform((v) => (v ? v : undefined)),
  notes: z.string().trim().max(1000).optional().transform((v) => (v ? v : undefined)),
  // Honeypot: real visitors never see or fill this field.
  company: z.string().optional(),
});

export type PublicBookingInput = z.infer<typeof publicBookingInputSchema>;

/**
 * Allowed cross-origin callers for the public booking endpoints — the
 * marketing site is a separate app/domain from this one.
 */
export const PUBLIC_BOOKING_ALLOWED_ORIGINS = [
  "https://www.ironmarkexteriors.ca",
  "https://ironmarkexteriors.ca",
  "http://localhost:3000",
];

export function corsHeadersFor(origin: string | null): Record<string, string> {
  const allowed = origin && PUBLIC_BOOKING_ALLOWED_ORIGINS.includes(origin) ? origin : PUBLIC_BOOKING_ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
