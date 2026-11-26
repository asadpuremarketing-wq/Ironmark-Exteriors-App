import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { serializePricingRate } from "@/lib/pricing";
import EstimatorView from "@/components/estimator/EstimatorView";

export default async function EstimatorPage() {
  const ratesRaw = await prisma.pricingRate.findMany({ orderBy: { service: "asc" } });
  const rates = ratesRaw.map(serializePricingRate);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Job Estimator</h1>
      <p className="mt-1 text-sm text-ink-900/60">
        Enter a service and its quantity (linear feet, squares, windows, downspouts — whatever that service is
        priced by) to get a suggested quote based on your rates in{" "}
        <Link href="/settings" className="font-semibold text-brand-electric hover:underline">
          Settings → Pricing Rates
        </Link>
        .
      </p>

      <div className="mt-6 rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
        <EstimatorView rates={rates} />
      </div>
    </div>
  );
}
