import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  businessSettingsInputSchema,
  getBusinessSettings,
  serializeBusinessSettings,
} from "@/lib/settings";

const SINGLETON_ID = "singleton";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const settings = await getBusinessSettings();
  return NextResponse.json({ settings: serializeBusinessSettings(settings) });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "You do not have permission to edit business settings." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = businessSettingsInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  // Ensure the singleton row exists before updating it.
  await getBusinessSettings();

  const data = parsed.data;

  const settings = await prisma.businessSettings.update({
    where: { id: SINGLETON_ID },
    data: {
      businessName: data.businessName,
      logoUrl: data.logoUrl ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      website: data.website ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      province: data.province,
      postalCode: data.postalCode ?? null,
      taxNumber: data.taxNumber ?? null,
      defaultTaxLabel: data.defaultTaxLabel,
      defaultTaxRate: data.defaultTaxRate,
      invoiceFooterMessage: data.invoiceFooterMessage ?? null,
    },
  });

  return NextResponse.json({ settings: serializeBusinessSettings(settings) });
}
