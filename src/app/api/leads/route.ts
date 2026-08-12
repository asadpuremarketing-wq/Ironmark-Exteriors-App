import { NextResponse } from "next/server";
import type { Prisma, LeadStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { leadInputSchema, LEAD_STATUSES } from "@/lib/leads";

function serializeLead<T extends { estimatedValue: unknown }>(lead: T) {
  return {
    ...lead,
    estimatedValue:
      lead.estimatedValue === null || lead.estimatedValue === undefined
        ? null
        : Number(lead.estimatedValue),
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
  const source = searchParams.get("source")?.trim();
  const service = searchParams.get("service")?.trim();
  const dateReceived = searchParams.get("dateReceived")?.trim();

  const where: Prisma.LeadWhereInput = {};
  const and: Prisma.LeadWhereInput[] = [];

  if (q) {
    and.push({
      OR: [
        { customer: { firstName: { contains: q, mode: "insensitive" } } },
        { customer: { lastName: { contains: q, mode: "insensitive" } } },
        { customer: { phone: { contains: q, mode: "insensitive" } } },
        { customer: { city: { contains: q, mode: "insensitive" } } },
        { serviceRequested: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (status && LEAD_STATUSES.includes(status as LeadStatus)) {
    and.push({ status: status as LeadStatus });
  }
  if (source) and.push({ leadSource: source });
  if (service) and.push({ serviceRequested: service });
  if (dateReceived) {
    const start = new Date(dateReceived);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateReceived);
    end.setHours(23, 59, 59, 999);
    and.push({ dateReceived: { gte: start, lte: end } });
  }

  if (and.length > 0) where.AND = and;

  const leads = await prisma.lead.findMany({
    where,
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ leads: leads.map(serializeLead) });
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

  const parsed = leadInputSchema.safeParse(body);
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

  const lead = await prisma.lead.create({
    data: {
      customerId: data.customerId,
      serviceRequested: data.serviceRequested,
      leadSource: data.leadSource,
      estimatedValue: data.estimatedValue ?? null,
      status: data.status ?? "NEW",
      dateReceived: data.dateReceived ? new Date(data.dateReceived) : new Date(),
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      notes: data.notes,
    },
    include: { customer: true },
  });

  return NextResponse.json({ lead: serializeLead(lead) }, { status: 201 });
}
