import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { marketingSpendInputSchema, serializeMarketingSpend } from "@/lib/marketing";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const spend = await prisma.marketingSpend.findUnique({ where: { id } });
  if (!spend) {
    return NextResponse.json({ error: "Marketing spend entry not found." }, { status: 404 });
  }

  return NextResponse.json({ spend: serializeMarketingSpend(spend) });
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

  const parsed = marketingSpendInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const existing = await prisma.marketingSpend.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Marketing spend entry not found." }, { status: 404 });
  }

  const data = parsed.data;

  const spend = await prisma.marketingSpend.update({
    where: { id },
    data: {
      date: new Date(data.date),
      platform: data.platform,
      campaignName: data.campaignName ?? null,
      amount: data.amount!,
      notes: data.notes ?? null,
    },
  });

  return NextResponse.json({ spend: serializeMarketingSpend(spend) });
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.marketingSpend.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Marketing spend entry not found." }, { status: 404 });
  }

  await prisma.marketingSpend.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
