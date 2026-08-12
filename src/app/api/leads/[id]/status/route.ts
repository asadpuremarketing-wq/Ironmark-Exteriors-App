import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LEAD_STATUSES } from "@/lib/leads";
import type { LeadStatus } from "@prisma/client";

type Params = Promise<{ id: string }>;

// Lightweight endpoint for quick status changes (e.g. from the leads list
// or a mobile card) without requiring the full lead form payload.
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

  const status =
    typeof body === "object" && body !== null && "status" in body
      ? (body as { status?: unknown }).status
      : undefined;

  if (typeof status !== "string" || !LEAD_STATUSES.includes(status as LeadStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: { status: status as LeadStatus },
  });

  return NextResponse.json({ ok: true, status: lead.status });
}
