import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { customerInputSchema, customerFullName } from "@/lib/customers";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { streetAddress: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ customers });
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

  const force = typeof body === "object" && body !== null && "force" in body
    ? Boolean((body as { force?: unknown }).force)
    : false;

  const parsed = customerInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (!force) {
    const duplicates = await prisma.customer.findMany({
      where: {
        OR: [
          { phone: data.phone },
          ...(data.email ? [{ email: data.email }] : []),
        ],
      },
      take: 5,
    });

    if (duplicates.length > 0) {
      return NextResponse.json(
        {
          duplicate: true,
          matches: duplicates.map((d) => ({
            id: d.id,
            name: customerFullName(d),
            phone: d.phone,
            email: d.email,
          })),
        },
        { status: 409 }
      );
    }
  }

  const customer = await prisma.customer.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      streetAddress: data.streetAddress,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      notes: data.notes,
      emailMarketingConsent: data.emailMarketingConsent ?? false,
      smsMarketingConsent: data.smsMarketingConsent ?? false,
      doNotContact: data.doNotContact ?? false,
    },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
