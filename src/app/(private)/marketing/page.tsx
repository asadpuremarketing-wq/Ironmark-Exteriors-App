import { prisma } from "@/lib/prisma";
import {
  serializeMarketingSpend,
  getLeadSourcePerformance,
  summarizeAdSpend,
  getOverallAdCostPerJob,
} from "@/lib/marketing";
import MarketingView from "@/components/marketing/MarketingView";

export default async function MarketingPage() {
  const [spendRaw, performance, overall] = await Promise.all([
    prisma.marketingSpend.findMany({ orderBy: { date: "desc" } }),
    getLeadSourcePerformance(),
    getOverallAdCostPerJob(),
  ]);

  const spend = spendRaw.map(serializeMarketingSpend);
  const adSummary = summarizeAdSpend(performance);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Marketing</h1>
        <p className="mt-1 text-sm text-ink-900/60">
          Log ad spend and see your real cost per job booked, by source.
        </p>
      </div>

      <MarketingView spend={spend} performance={performance} adSummary={adSummary} overall={overall} />
    </div>
  );
}
