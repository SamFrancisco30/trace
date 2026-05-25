import { EntryForm } from "@/components/entry-form";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { Timeline } from "@/components/timeline";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [events, positions] = await Promise.all([
    prisma.event.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.portfolioPosition.findMany({
      orderBy: { ticker: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-12 px-5 py-8 sm:px-8 sm:py-12">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-zinc-500">Trace</p>
        <h1 className="text-3xl font-semibold tracking-normal text-black">
          Trading journal
        </h1>
      </header>

      <EntryForm />

      <PortfolioSummary
        positions={positions.map((position) => ({
          ticker: position.ticker,
          shares: position.shares.toNumber(),
          avgCost: position.avgCost?.toNumber() ?? null,
        }))}
      />

      <Timeline entries={events} />
    </main>
  );
}
