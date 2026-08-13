import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const intervals = await prisma.serviceReminderInterval.findMany({ orderBy: { service: "asc" } });
  return NextResponse.json({ intervals });
}

const patchSchema = z.object({
  intervals: z.array(
    z.object({
      id: z.string().min(1),
      months: z.number().int().min(1).max(60),
    })
  ),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "You do not have permission to edit service intervals." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.intervals.map((i) =>
      prisma.serviceReminderInterval.update({ where: { id: i.id }, data: { months: i.months } })
    )
  );

  const intervals = await prisma.serviceReminderInterval.findMany({ orderBy: { service: "asc" } });
  return NextResponse.json({ intervals });
}
