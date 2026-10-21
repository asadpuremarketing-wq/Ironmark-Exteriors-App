import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateJobNumber } from "@/lib/jobs";
import {
  BOOKING_SLOTS,
  PUBLIC_BOOKABLE_SERVICES,
  corsHeadersFor,
  publicBookingInputSchema,
} from "@/lib/publicBooking";

/**
 * Public, unauthenticated: creates a real Job (status BOOKED) directly from
 * a website booking, so it shows up on the calendar immediately with no
 * manual entry. Re-validates slot availability inside the same transaction
 * that creates the Job, so two visitors racing for the same slot can't both
 * win it (the second one's query simply sees the first one's row).
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeadersFor(origin);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400, headers });
  }

  // Honeypot: bots fill every field, real visitors never see this one.
  if (typeof body === "object" && body !== null && "company" in body && (body as { company?: unknown }).company) {
    return NextResponse.json({ ok: true, honeypot: true }, { headers });
  }

  const parsed = publicBookingInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400, headers }
    );
  }

  const data = parsed.data;
  const serviceLabel = PUBLIC_BOOKABLE_SERVICES[data.service];
  const slot = BOOKING_SLOTS.find((s) => s.startTime === data.startTime)!;

  const dayStart = new Date(`${data.date}T00:00:00.000Z`);
  const dayEnd = new Date(`${data.date}T23:59:59.999Z`);

  try {
    const job = await prisma.$transaction(
      async (tx) => {
      const conflict = await tx.job.findFirst({
        where: {
          scheduledDate: { gte: dayStart, lte: dayEnd },
          startTime: data.startTime,
          status: { notIn: ["CANCELLED"] },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new Error("SLOT_TAKEN");
      }

      let customer = await tx.customer.findFirst({
        where: { OR: [{ phone: data.phone }, { email: data.email }] },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            email: data.email,
            streetAddress: data.streetAddress,
            city: data.city,
            postalCode: data.postalCode,
            status: "ACTIVE_CUSTOMER",
          },
        });
      }

      const jobNumber = await generateJobNumber(tx);

      return tx.job.create({
        data: {
          jobNumber,
          customerId: customer.id,
          service: serviceLabel,
          bookingSource: "Website Booking",
          serviceAddress: data.streetAddress,
          city: data.city,
          postalCode: data.postalCode,
          scheduledDate: dayStart,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "BOOKED",
          notes: data.notes ? `Booked online.\n\n${data.notes}` : "Booked online.",
        },
      });
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json(
      { ok: true, jobNumber: job.jobNumber, date: data.date, slot: slot.label },
      { status: 201, headers }
    );
  } catch (err) {
    const isSlotConflict =
      (err instanceof Error && err.message === "SLOT_TAKEN") ||
      // Postgres serialization failure (P2034): two bookings raced for the
      // same slot under SERIALIZABLE isolation and this one lost.
      (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2034");

    if (isSlotConflict) {
      return NextResponse.json(
        { error: "That time slot was just booked by someone else. Please pick another." },
        { status: 409, headers }
      );
    }
    console.error("[Public Booking] Failed to create job:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500, headers });
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeadersFor(origin) });
}
