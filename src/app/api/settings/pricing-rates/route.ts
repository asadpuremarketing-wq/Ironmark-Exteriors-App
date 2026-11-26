import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { pricingRatesPatchSchema, serializePricingRate } from "@/lib/pricing";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rates = await prisma.pricingRate.findMany({ orderBy: { service: "asc" } });
  return NextResponse.json({ rates: rates.map(serializePricingRate) });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "You do not have permission to edit pricing rates." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = pricingRatesPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.rates.map((r) =>
      prisma.pricingRate.update({
        where: { id: r.id },
        data: {
          ratePerUnit: r.ratePerUnit,
          flatFee: r.flatFee,
          minimumPrice: r.minimumPrice,
          ...(r.unitLabel ? { unitLabel: r.unitLabel } : {}),
        },
      })
    )
  );

  const rates = await prisma.pricingRate.findMany({ orderBy: { service: "asc" } });
  return NextResponse.json({ rates: rates.map(serializePricingRate) });
}
