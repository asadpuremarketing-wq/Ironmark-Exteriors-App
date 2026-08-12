import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { leadInputSchema } from "@/lib/leads";

type Params = Promise<{ id: string }>;

function serializeLead<T extends { estimatedValue: unknown }>(lead: T) {
  return {
    ...lead,
    estimatedValue:
      lead.estimatedValue === null || lead.estimatedValue === undefined
        ? null
        : Number(lead.estimatedValue),
  };
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  return NextResponse.json({ lead: serializeLead(lead) });
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

  const parsed = leadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const data = parsed.data;

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      serviceRequested: data.serviceRequested,
      leadSource: data.leadSource,
      estimatedValue: data.estimatedValue ?? null,
      status: data.status ?? existing.status,
      dateReceived: data.dateReceived ? new Date(data.dateReceived) : existing.dateReceived,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      notes: data.notes ?? null,
    },
    include: { customer: true },
  });

  return NextResponse.json({ lead: serializeLead(lead) });
}
