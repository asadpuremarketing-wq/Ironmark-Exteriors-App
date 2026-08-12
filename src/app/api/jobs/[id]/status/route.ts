import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { JOB_STATUSES } from "@/lib/jobs";
import type { JobStatus } from "@prisma/client";

type Params = Promise<{ id: string }>;

// Lightweight endpoint for quick status changes (mark In Progress, Cancel,
// etc.) without requiring the full job form payload. Completing a job uses
// the dedicated /complete endpoint instead, since it also needs a final price.
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

  if (typeof status !== "string" || !JOB_STATUSES.includes(status as JobStatus) || status === "COMPLETED") {
    return NextResponse.json(
      { error: "Invalid status. Use /complete to mark a job as Completed." },
      { status: 400 }
    );
  }

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const job = await prisma.job.update({
    where: { id },
    data: { status: status as JobStatus },
  });

  return NextResponse.json({ ok: true, status: job.status });
}
