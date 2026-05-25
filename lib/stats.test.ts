import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  portfolioPosition: {
    findMany: vi.fn(),
  },
  event: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

import {
  getPortfolioAllocation,
  getWeeklySentimentTrend,
  getWeeklyTradeFrequency,
} from "./stats";

describe("stats helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    prismaMock.portfolioPosition.findMany.mockReset();
    prismaMock.event.findMany.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fills missing weeks with zeros in weekly trade frequency", async () => {
    vi.setSystemTime(new Date("2026-05-25T12:00:00.000Z"));

    prismaMock.event.findMany.mockResolvedValueOnce([
      {
        createdAt: new Date("2026-05-13T12:00:00.000Z"),
        parsedData: { action: "BUY" },
      },
      {
        createdAt: new Date("2026-05-20T12:00:00.000Z"),
        parsedData: { action: "SELL" },
      },
    ]);

    const result = await getWeeklyTradeFrequency(3);

    expect(result).toEqual([
      { weekLabel: "2026-05-11", buys: 1, sells: 0 },
      { weekLabel: "2026-05-18", buys: 0, sells: 1 },
      { weekLabel: "2026-05-25", buys: 0, sells: 0 },
    ]);
  });

  it("fills missing weeks with zeros in weekly sentiment trend", async () => {
    vi.setSystemTime(new Date("2026-05-25T12:00:00.000Z"));

    prismaMock.event.findMany.mockResolvedValueOnce([
      {
        createdAt: new Date("2026-05-13T12:00:00.000Z"),
        parsedData: { sentiment: "BULLISH" },
      },
      {
        createdAt: new Date("2026-05-20T12:00:00.000Z"),
        parsedData: { sentiment: "BEARISH" },
      },
    ]);

    const result = await getWeeklySentimentTrend(3);

    expect(result).toEqual([
      {
        weekLabel: "2026-05-11",
        bullish: 1,
        bearish: 0,
        neutral: 0,
        mixed: 0,
      },
      {
        weekLabel: "2026-05-18",
        bullish: 0,
        bearish: 1,
        neutral: 0,
        mixed: 0,
      },
      {
        weekLabel: "2026-05-25",
        bullish: 0,
        bearish: 0,
        neutral: 0,
        mixed: 0,
      },
    ]);
  });

  it("computes portfolio allocation from holdings", async () => {
    prismaMock.portfolioPosition.findMany.mockResolvedValueOnce([
      {
        ticker: "NVDA",
        shares: { toNumber: () => 10 },
        avgCost: { toNumber: () => 100 },
      },
      {
        ticker: "AMD",
        shares: { toNumber: () => 5 },
        avgCost: { toNumber: () => 200 },
      },
    ]);

    const result = await getPortfolioAllocation();

    expect(result).toEqual([
      { ticker: "NVDA", value: 1000, percentage: 50 },
      { ticker: "AMD", value: 1000, percentage: 50 },
    ]);
  });
});
