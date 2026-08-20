import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jobInputSchema } from "@/lib/jobs";

type Params = Promise<{ id: string }>;

function serializeJob<T extends { quotedPrice: unknown; finalPrice: unknown }>(job: T) {
  return {
    ...job,
    quotedPrice: job.quotedPrice === null || job.quotedPrice === undefined ? null : Number(job.quotedPrice),
    finalPrice: job.finalPrice === null || job.finalPrice === undefined ? null : Number(job.finalPrice),
  };
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { customer: true, lead: true },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ job: serializeJob(job) });
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = jobInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const data = parsed.data;
  const newScheduledDate = new Date(data.scheduledDate);

  const dateChanged =
    newScheduledDate.toISOString().slice(0, 10) !== existing.scheduledDate.toISOString().slice(0, 10);
  const timeChanged = (data.startTime ?? undefined) !== (existing.startTime ?? undefined);
  const rescheduled = dateChanged || timeChanged;

  // If the schedule changed and the caller didn't explicitly pick a new
  // status (it still matches what was there before), default to
  // Rescheduled. If they did pick a different status, respect that choice.
  const statusExplicitlyChosen = data.status !== undefined && data.status !== existing.status;
  const nextStatus = statusExplicitlyChosen
    ? data.status!
    : rescheduled
      ? "RESCHEDULED"
      : (data.status ?? existing.status);

  const job = await prisma.job.update({
    where: { id },
    data: {
      service: data.service,
      bookingSource: data.bookingSource ?? existing.bookingSource,
      serviceAddress: data.serviceAddress ?? null,
      city: data.city ?? null,
      province: data.province,
      postalCode: data.postalCode ?? null,
      scheduledDate: newScheduledDate,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      estimatedDuration: data.estimatedDuration ?? null,
      quotedPrice: data.quotedPrice ?? null,
      finalPrice: data.finalPrice ?? existing.finalPrice,
      status: nextStatus,
      notes: data.notes ?? null,
    },
    include: { customer: true, lead: true },
  });

  return NextResponse.json({ job: serializeJob(job) });
}
