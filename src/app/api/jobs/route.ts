import { NextResponse } from "next/server";
import type { Prisma, JobStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jobInputSchema, generateJobNumber, JOB_STATUSES } from "@/lib/jobs";

function serializeJob<T extends { quotedPrice: unknown; finalPrice: unknown }>(job: T) {
  return {
    ...job,
    quotedPrice: job.quotedPrice === null || job.quotedPrice === undefined ? null : Number(job.quotedPrice),
    finalPrice: job.finalPrice === null || job.finalPrice === undefined ? null : Number(job.finalPrice),
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status")?.trim();
  const service = searchParams.get("service")?.trim();
  const city = searchParams.get("city")?.trim();
  const scheduledDate = searchParams.get("scheduledDate")?.trim();
  const range = searchParams.get("range")?.trim();

  const and: Prisma.JobWhereInput[] = [];

  if (q) {
    and.push({
      OR: [
        { jobNumber: { contains: q, mode: "insensitive" } },
        { customer: { firstName: { contains: q, mode: "insensitive" } } },
        { customer: { lastName: { contains: q, mode: "insensitive" } } },
        { customer: { phone: { contains: q, mode: "insensitive" } } },
        { serviceAddress: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { service: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (status && JOB_STATUSES.includes(status as JobStatus)) {
    and.push({ status: status as JobStatus });
  }
  if (service) and.push({ service });
  if (city) and.push({ city });
  if (scheduledDate) {
    const start = new Date(scheduledDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(scheduledDate);
    end.setHours(23, 59, 59, 999);
    and.push({ scheduledDate: { gte: start, lte: end } });
  }

  // Additive: `?range=YYYY-MM-DD,YYYY-MM-DD` returns jobs whose scheduledDate
  // falls within the (inclusive) window — used by the Calendar view. Existing
  // callers that don't pass `range` are unaffected.
  if (range) {
    const [rangeStart, rangeEnd] = range.split(",").map((s) => s.trim());
    if (rangeStart && rangeEnd) {
      const start = new Date(`${rangeStart}T00:00:00.000Z`);
      const end = new Date(`${rangeEnd}T23:59:59.999Z`);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        and.push({ scheduledDate: { gte: start, lte: end } });
      }
    }
  }

  const jobs = await prisma.job.findMany({
    where: and.length > 0 ? { AND: and } : undefined,
    include: { customer: true, lead: true },
    orderBy: { scheduledDate: "desc" },
  });

  return NextResponse.json({ jobs: jobs.map(serializeJob) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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

  const data = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
  if (!customer) {
    return NextResponse.json({ error: "Selected customer does not exist." }, { status: 400 });
  }

  if (data.leadId) {
    const existingJobForLead = await prisma.job.findUnique({ where: { leadId: data.leadId } });
    if (existingJobForLead) {
      return NextResponse.json(
        { error: "This lead has already been converted into a job.", existingJobId: existingJobForLead.id },
        { status: 409 }
      );
    }
  }

  const job = await prisma.$transaction(async (tx) => {
    const jobNumber = await generateJobNumber(tx);
    return tx.job.create({
      data: {
        jobNumber,
        customerId: data.customerId,
        leadId: data.leadId,
        service: data.service,
        serviceAddress: data.serviceAddress,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        scheduledDate: new Date(data.scheduledDate),
        startTime: data.startTime,
        estimatedDuration: data.estimatedDuration,
        quotedPrice: data.quotedPrice ?? null,
        finalPrice: data.finalPrice ?? null,
        status: data.status ?? "BOOKED",
        notes: data.notes,
      },
      include: { customer: true, lead: true },
    });
  });

  if (data.leadId) {
    await prisma.lead.update({ where: { id: data.leadId }, data: { status: "BOOKED" } });
  }

  return NextResponse.json({ job: serializeJob(job) }, { status: 201 });
}
