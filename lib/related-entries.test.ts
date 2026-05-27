import { describe, expect, it } from "vitest";

import { findRelatedEntries } from "./related-entries";

describe("findRelatedEntries", () => {
  it("ranks same-ticker entries ahead of unrelated entries", () => {
    const results = findRelatedEntries(
      {
        rawText: "TSLA may pull back",
        entryKind: "prediction",
        ticker: "TSLA",
        predictionDirection: "pullback",
      },
      [
        {
          id: "same-ticker",
          createdAt: new Date("2026-05-20T10:00:00Z"),
          rawText: "Trimmed TSLA into strength",
          parsedData: {
            action: "SELL",
            tickers: ["TSLA"],
            tags: ["trade"],
          },
        },
        {
          id: "unrelated",
          createdAt: new Date("2026-05-25T10:00:00Z"),
          rawText: "AMD looks strong",
          parsedData: {
            action: "WATCH",
            tickers: ["AMD"],
            tags: ["prediction", "direction:up"],
          },
        },
      ],
    );

    expect(results[0]?.id).toBe("same-ticker");
  });

  it("surfaces contrasting prediction matches when directions differ", () => {
    const results = findRelatedEntries(
      {
        rawText: "TSLA may break out",
        entryKind: "prediction",
        ticker: "TSLA",
        predictionDirection: "breakout",
      },
      [
        {
          id: "contrast",
          createdAt: new Date("2026-05-21T10:00:00Z"),
          rawText: "TSLA looks weak here",
          parsedData: {
            action: "WATCH",
            tickers: ["TSLA"],
            tags: ["prediction", "direction:down"],
          },
        },
      ],
    );

    expect(results[0]).toMatchObject({
      id: "contrast",
      matchReason: "contrasting_prediction",
      predictionDirection: "down",
    });
  });

  it("caps results at three suggestions", () => {
    const results = findRelatedEntries(
      {
        rawText: "NVDA still looks strong",
        entryKind: "prediction",
        ticker: "NVDA",
        predictionDirection: "up",
      },
      [
        {
          id: "1",
          createdAt: new Date("2026-05-20T10:00:00Z"),
          rawText: "NVDA note 1",
          parsedData: {
            action: "WATCH",
            tickers: ["NVDA"],
            tags: ["prediction", "direction:up"],
          },
        },
        {
          id: "2",
          createdAt: new Date("2026-05-21T10:00:00Z"),
          rawText: "NVDA note 2",
          parsedData: {
            action: "WATCH",
            tickers: ["NVDA"],
            tags: ["prediction", "direction:down"],
          },
        },
        {
          id: "3",
          createdAt: new Date("2026-05-22T10:00:00Z"),
          rawText: "NVDA note 3",
          parsedData: {
            action: "BUY",
            tickers: ["NVDA"],
            tags: ["trade"],
          },
        },
        {
          id: "4",
          createdAt: new Date("2026-05-23T10:00:00Z"),
          rawText: "NVDA note 4",
          parsedData: {
            action: "NOTE",
            tickers: ["NVDA"],
            tags: ["reflection"],
          },
        },
      ],
    );

    expect(results).toHaveLength(3);
  });
});
