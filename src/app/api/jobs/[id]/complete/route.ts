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

  const finalPriceRaw =
    typeof body === "object" && body !== null && "finalPrice" in body
      ? (body as { finalPrice?: unknown }).finalPrice
      : undefined;

  const finalPrice = Number(finalPriceRaw);
  if (!Number.isFinite(finalPrice) || finalPrice < 0) {
    return NextResponse.json({ error: "A valid final price is required." }, { status: 400 });
  }

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const job = await prisma.job.update({
    where: { id },
    data: { status: "COMPLETED", finalPrice },
    include: { customer: true, lead: true },
  });

  return NextResponse.json({ job: serializeJob(job) });
}
