import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD must be set in your environment (.env) before seeding."
    );
  }

  if (password.length < 8) {
    throw new Error("ADMIN_INITIAL_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const normalizedEmail = email.toLowerCase();

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      passwordHash,
      role: "OWNER",
    },
    create: {
      name: "Owner",
      email: normalizedEmail,
      passwordHash,
      role: "OWNER",
    },
  });

  console.log(`Owner account ready: ${user.email} (role: ${user.role})`);

  // Sensible default service reminder intervals for a roofing/siding/gutters
  // contractor. Upsert-only, so re-running seed never overwrites intervals
  // the owner has already customized in Settings.
  const defaultIntervals: { service: string; months: number }[] = [
    { service: "Gutter Cleaning", months: 6 },
    { service: "Roof Inspection", months: 12 },
    { service: "Siding Wash", months: 12 },
    { service: "Eavestrough Cleaning", months: 6 },
    { service: "Roof Cleaning", months: 12 },
    { service: "Window Cleaning", months: 6 },
    { service: "Pressure Washing", months: 12 },
  ];

  for (const interval of defaultIntervals) {
    await prisma.serviceReminderInterval.upsert({
      where: { service: interval.service },
      update: {},
      create: interval,
    });
  }

  console.log(`Service reminder intervals ready (${defaultIntervals.length} defaults).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
