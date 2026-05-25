import { prisma } from "@/lib/db";

/* -------------------------------------------------------------------------- */
/*  Portfolio allocation (pie chart)                                          */
/* -------------------------------------------------------------------------- */

export type AllocationItem = {
  ticker: string;
  value: number;
  percentage: number;
};

export async function getPortfolioAllocation(): Promise<AllocationItem[]> {
  const positions = await prisma.portfolioPosition.findMany();

  const items = positions.map((p) => ({
    ticker: p.ticker,
    value: p.shares.toNumber() * (p.avgCost?.toNumber() ?? 0),
  }));

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return items.map((item) => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Weekly trade frequency (bar chart)                                        */
/* -------------------------------------------------------------------------- */

export type WeeklyTradeItem = {
  weekLabel: string;
  buys: number;
  sells: number;
};

export async function getWeeklyTradeFrequency(
  weeks = 12,
): Promise<WeeklyTradeItem[]> {
  const events = await prisma.event.findMany({
    where: { deletedAt: null },
    select: { createdAt: true, parsedData: true },
  });

  const weekStarts = buildWeekStarts(weeks);
  const buckets = new Map(
    weekStarts.map((weekStart) => [weekStart, { buys: 0, sells: 0 }]),
  );

  for (const e of events) {
    const key = weekBucketKey(e.createdAt);
    if (!buckets.has(key)) continue;

    const action = getParsedField(e.parsedData, "action");
    if (action !== "BUY" && action !== "SELL") continue;

    const bucket = buckets.get(key)!;
    if (action === "BUY") bucket.buys++;
    else bucket.sells++;
  }

  return weekStarts.map((weekLabel) => {
    const bucket = buckets.get(weekLabel)!;
    return {
      weekLabel,
      buys: bucket.buys,
      sells: bucket.sells,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  Weekly sentiment trend (line chart)                                       */
/* -------------------------------------------------------------------------- */

export type WeeklySentimentItem = {
  weekLabel: string;
  bullish: number;
  bearish: number;
  neutral: number;
  mixed: number;
};

export async function getWeeklySentimentTrend(
  weeks = 12,
): Promise<WeeklySentimentItem[]> {
  const events = await prisma.event.findMany({
    where: { deletedAt: null },
    select: { createdAt: true, parsedData: true },
  });

  const weekStarts = buildWeekStarts(weeks);
  const buckets = new Map(
    weekStarts.map((weekStart) => [
      weekStart,
      { bullish: 0, bearish: 0, neutral: 0, mixed: 0 },
    ]),
  );

  for (const e of events) {
    const key = weekBucketKey(e.createdAt);
    if (!buckets.has(key)) continue;

    const sentiment = getParsedField(e.parsedData, "sentiment");
    if (
      sentiment !== "BULLISH" &&
      sentiment !== "BEARISH" &&
      sentiment !== "NEUTRAL" &&
      sentiment !== "MIXED"
    )
      continue;

    const bucket = buckets.get(key)!;
    if (sentiment === "BULLISH") bucket.bullish++;
    else if (sentiment === "BEARISH") bucket.bearish++;
    else if (sentiment === "NEUTRAL") bucket.neutral++;
    else if (sentiment === "MIXED") bucket.mixed++;
  }

  return weekStarts.map((weekLabel) => {
    const bucket = buckets.get(weekLabel)!;
    return {
      weekLabel,
      bullish: bucket.bullish,
      bearish: bucket.bearish,
      neutral: bucket.neutral,
      mixed: bucket.mixed,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getParsedField(
  data: unknown,
  field: string,
): string | undefined {
  if (data && typeof data === "object" && field in data) {
    const value = (data as Record<string, unknown>)[field];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function weekBucketKey(date: Date): string {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  // Monday = start of week
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);

  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildWeekStarts(weeks: number): string[] {
  const count = Math.max(1, Math.floor(weeks));
  const currentWeekStart = startOfWeek(new Date());
  const starts: string[] = [];

  for (let offset = count - 1; offset >= 0; offset--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - offset * 7);
    starts.push(weekBucketKey(weekStart));
  }

  return starts;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
