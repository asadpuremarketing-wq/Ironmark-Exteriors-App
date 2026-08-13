import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Archiving invoices is a financial action — restrict to Owner/Admin.
  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "You do not have permission to archive invoices." },
      { status: 403 }
    );
  }

  const { id } = await params;

  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  let confirm = false;
  try {
    const body = await request.json();
    confirm = body?.confirm === true;
  } catch {
    // No body — treat as not confirmed.
  }

  if (existing.payments.length > 0 && !confirm) {
    return NextResponse.json(
      {
        error:
          "This invoice has recorded payments. Archiving it will hide it from the default list but keep the payment history intact for audit purposes. Confirm to proceed.",
        requiresConfirmation: true,
      },
      { status: 409 }
    );
  }

  await prisma.invoice.update({ where: { id }, data: { archivedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
