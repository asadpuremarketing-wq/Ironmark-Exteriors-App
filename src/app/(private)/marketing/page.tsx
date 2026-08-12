import { prisma } from "@/lib/prisma";
import { serializeMarketingSpend, getLeadSourcePerformance } from "@/lib/marketing";
import MarketingView from "@/components/marketing/MarketingView";

export default async function MarketingPage() {
  const [spendRaw, performance] = await Promise.all([
    prisma.marketingSpend.findMany({ orderBy: { date: "desc" } }),
    getLeadSourcePerformance(),
  ]);

  const spend = spendRaw.map(serializeMarketingSpend);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Marketing</h1>
        <p className="mt-1 text-sm text-ink-900/60">Track ad spend and see which lead sources perform best.</p>
      </div>

      <MarketingView spend={spend} performance={performance} />
    </div>
  );
}
