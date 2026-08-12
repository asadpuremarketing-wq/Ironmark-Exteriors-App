import { NextResponse } from "next/server";
import type { Prisma, MarketingPlatform } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { marketingSpendInputSchema, serializeMarketingSpend, MARKETING_PLATFORMS } from "@/lib/marketing";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform")?.trim();
  const startDate = searchParams.get("startDate")?.trim();
  const endDate = searchParams.get("endDate")?.trim();

  const and: Prisma.MarketingSpendWhereInput[] = [];

  if (platform && MARKETING_PLATFORMS.includes(platform as MarketingPlatform)) {
    and.push({ platform: platform as MarketingPlatform });
  }

  if (startDate || endDate) {
    const range: Prisma.DateTimeFilter = {};
    if (startDate) range.gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) range.lte = new Date(`${endDate}T23:59:59.999Z`);
    and.push({ date: range });
  }

  const spend = await prisma.marketingSpend.findMany({
    where: and.length > 0 ? { AND: and } : undefined,
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ spend: spend.map(serializeMarketingSpend) });
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

  const parsed = marketingSpendInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const spend = await prisma.marketingSpend.create({
    data: {
      date: new Date(data.date),
      platform: data.platform,
      campaignName: data.campaignName,
      amount: data.amount!,
      notes: data.notes,
    },
  });

  return NextResponse.json({ spend: serializeMarketingSpend(spend) }, { status: 201 });
}
