import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

function serializeJob<T extends { quotedPrice: unknown; finalPrice: unknown }>(job: T) {
  return {
    ...job,
    quotedPrice: job.quotedPrice === null || job.quotedPrice === undefined ? null : Number(job.quotedPrice),
    finalPrice: job.finalPrice === null || job.finalPrice === undefined ? null : Number(job.finalPrice),
  };
}

export async function POST(request: Request, { params }: { params: Params }) {
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

  const parsedBody = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  const finalPrice = Number(parsedBody.finalPrice);
  if (!Number.isFinite(finalPrice) || finalPrice < 0) {
    return NextResponse.json({ error: "A valid final price is required." }, { status: 400 });
  }

  const actualDuration =
    typeof parsedBody.actualDuration === "string" && parsedBody.actualDuration.trim()
      ? parsedBody.actualDuration.trim()
      : undefined;
  const travelTime =
    typeof parsedBody.travelTime === "string" && parsedBody.travelTime.trim()
      ? parsedBody.travelTime.trim()
      : undefined;

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const job = await prisma.job.update({
    where: { id },
    data: { status: "COMPLETED", finalPrice, actualDuration, travelTime },
    include: { customer: true, lead: true },
  });

  // A completed job is what defines a "past customer" in this app. Only
  // DO_NOT_CONTACT is left alone (it's a stronger, deliberately-set signal
  // that shouldn't be silently overwritten by a job completion).
  if (job.customer.status !== "DO_NOT_CONTACT" && job.customer.status !== "PAST_CUSTOMER") {
    await prisma.customer.update({
      where: { id: job.customerId },
      data: { status: "PAST_CUSTOMER" },
    });
  }

  return NextResponse.json({ job: serializeJob(job) });
}
