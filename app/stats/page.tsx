import { StatsCharts } from "@/components/stats-charts";
import {
  getPortfolioAllocation,
  getWeeklyTradeFrequency,
  getWeeklySentimentTrend,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const [allocation, weeklyTrades, weeklySentiment] = await Promise.all([
    getPortfolioAllocation(),
    getWeeklyTradeFrequency(),
    getWeeklySentimentTrend(),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-5 py-8 sm:px-8 sm:py-12">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-zinc-500">Statistics</p>
        <h1 className="text-3xl font-semibold tracking-normal text-black">
          Trading analytics
        </h1>
      </header>

      <StatsCharts
        allocation={allocation}
        weeklyTrades={weeklyTrades}
        weeklySentiment={weeklySentiment}
      />
    </main>
  );
}