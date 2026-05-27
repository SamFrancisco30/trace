import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { getRelatedEntriesForDraft } from "./related-entry-actions";

describe("getRelatedEntriesForDraft", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.portfolioPosition.deleteMany();
    await prisma.event.deleteMany();
  });

  it("excludes soft-deleted entries", async () => {
    await prisma.event.create({
      data: {
        rawText: "TSLA may pull back",
        parsedData: {
          action: "WATCH",
          tickers: ["TSLA"],
          tags: ["prediction", "direction:pullback"],
        },
      },
    });

    await prisma.event.create({
      data: {
        rawText: "Old deleted TSLA note",
        parsedData: {
          action: "WATCH",
          tickers: ["TSLA"],
          tags: ["prediction", "direction:down"],
        },
        deletedAt: new Date(),
      },
    });

    const results = await getRelatedEntriesForDraft({
      rawText: "TSLA still looks weak",
      entryKind: "prediction",
      ticker: "TSLA",
      predictionDirection: "down",
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.rawText).toBe("TSLA may pull back");
  });

  it("returns display-ready suggestions ordered by relevance", async () => {
    await prisma.event.create({
      data: {
        rawText: "AMD looks strong",
        parsedData: {
          action: "WATCH",
          tickers: ["AMD"],
          tags: ["prediction", "direction:up"],
        },
      },
    });

    await prisma.event.create({
      data: {
        rawText: "TSLA trimmed into resistance",
        parsedData: {
          action: "SELL",
          tickers: ["TSLA"],
          tags: ["trade"],
        },
      },
    });

    const results = await getRelatedEntriesForDraft({
      rawText: "TSLA may break out",
      entryKind: "prediction",
      ticker: "TSLA",
      predictionDirection: "breakout",
    });

    expect(results[0]).toMatchObject({
      rawText: "TSLA trimmed into resistance",
      ticker: "TSLA",
    });
  });
});
