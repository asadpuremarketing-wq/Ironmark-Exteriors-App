import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  BOOKING_SLOTS,
  corsHeadersFor,
  isBookableDate,
  isPublicBookableService,
} from "@/lib/publicBooking";

/**
 * Public, unauthenticated: returns which 2-hour slots are still open for a
 * given bookable service + date, so the marketing site can grey out taken
 * slots before the visitor even picks one. The booking endpoint re-checks
 * availability at write time too, so this is a convenience read, not the
 * only guard against double-booking.
 */
export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeadersFor(origin);

  const { searchParams } = new URL(request.url);
  const service = searchParams.get("service")?.trim() ?? "";
  const date = searchParams.get("date")?.trim() ?? "";

  if (!isPublicBookableService(service)) {
    return NextResponse.json({ error: "Unknown or unbookable service." }, { status: 400, headers });
  }
  if (!isBookableDate(date)) {
    return NextResponse.json({ error: "That date is not available for booking." }, { status: 400, headers });
  }

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  // Any booked job that day (not just this service) occupies a slot — the
  // 2-hour gap applies across the whole crew's schedule, not per service.
  const jobsThatDay = await prisma.job.findMany({
    where: {
      scheduledDate: { gte: dayStart, lte: dayEnd },
      status: { notIn: ["CANCELLED"] },
    },
    select: { startTime: true },
  });

  const takenStartTimes = new Set(jobsThatDay.map((j) => j.startTime).filter(Boolean));

  const slots = BOOKING_SLOTS.map((slot) => ({
    ...slot,
    available: !takenStartTimes.has(slot.startTime),
  }));

  return NextResponse.json({ date, slots }, { headers });
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeadersFor(origin) });
}
