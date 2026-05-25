import { describe, expect, it } from "vitest";

import { rebuildPortfolioPositions } from "./portfolio-state";

describe("rebuildPortfolioPositions", () => {
  it("rebuilds positions from a timeline of trades and holdings snapshots", () => {
    const positions = rebuildPortfolioPositions([
      {
        parsedData: {
          action: "BUY",
          tickers: ["NVDA"],
          quantity: 20,
          price: 187,
        },
      },
      {
        parsedData: {
          action: "SELL",
          tickers: ["NVDA"],
          quantity: 5,
          price: 200,
        },
      },
      {
        parsedData: {
          action: "HOLDINGS",
          positions: [
            { ticker: "AMD", shares: 12, avgCost: 150 },
            { ticker: "MSFT", shares: 4, avgCost: 410 },
          ],
        },
      },
    ]);

    expect(positions).toEqual([
      { ticker: "AMD", shares: 12, avgCost: 150 },
      { ticker: "MSFT", shares: 4, avgCost: 410 },
    ]);
  });

  it("drops positions that are sold to zero", () => {
    const positions = rebuildPortfolioPositions([
      {
        parsedData: {
          action: "BUY",
          tickers: ["NVDA"],
          quantity: 10,
          price: 100,
        },
      },
      {
        parsedData: {
          action: "SELL",
          tickers: ["NVDA"],
          quantity: 10,
          price: 110,
        },
      },
    ]);

    expect(positions).toEqual([]);
  });

  it("drops positions sold to zero in multiple steps", () => {
    const positions = rebuildPortfolioPositions([
      {
        parsedData: {
          action: "BUY",
          tickers: ["AAPL"],
          quantity: 50,
          price: 175,
        },
      },
      {
        parsedData: {
          action: "SELL",
          tickers: ["AAPL"],
          quantity: 30,
          price: 180,
        },
      },
      {
        parsedData: {
          action: "SELL",
          tickers: ["AAPL"],
          quantity: 20,
          price: 185,
        },
      },
    ]);

    expect(positions).toEqual([]);
  });

  it("throws when an event oversells a position", () => {
    expect(() =>
      rebuildPortfolioPositions([
        {
          parsedData: {
            action: "BUY",
            tickers: ["NVDA"],
            quantity: 30,
            price: 100,
          },
        },
        {
          parsedData: {
            action: "SELL",
            tickers: ["NVDA"],
            quantity: 50,
            price: 110,
          },
        },
      ]),
    ).toThrow("Cannot sell 50 shares of NVDA: only 30 held");
  });

  it("throws when selling from a position that does not exist", () => {
    expect(() =>
      rebuildPortfolioPositions([
        {
          parsedData: {
            action: "SELL",
            tickers: ["GOOG"],
            quantity: 5,
            price: 140,
          },
        },
      ]),
    ).toThrow("Cannot sell 5 shares of GOOG: only 0 held");
  });

  it("keeps other positions when one ticker is fully liquidated", () => {
    const positions = rebuildPortfolioPositions([
      {
        parsedData: {
          action: "BUY",
          tickers: ["NVDA"],
          quantity: 10,
          price: 100,
        },
      },
      {
        parsedData: {
          action: "BUY",
          tickers: ["AMD"],
          quantity: 20,
          price: 150,
        },
      },
      {
        parsedData: {
          action: "SELL",
          tickers: ["NVDA"],
          quantity: 10,
          price: 110,
        },
      },
    ]);

    expect(positions).toEqual([
      { ticker: "AMD", shares: 20, avgCost: 150 },
    ]);
  });
});
