import { describe, expect, it } from "vitest";

import { applyTradeToPosition } from "./portfolio";

describe("applyTradeToPosition", () => {
  it("adds a buy to an empty position", () => {
    const next = applyTradeToPosition(null, {
      action: "BUY",
      quantity: 20,
      price: 187,
    });

    expect(next).toEqual({ shares: 20, avgCost: 187 });
  });

  it("recalculates average cost for additional buys", () => {
    const next = applyTradeToPosition(
      { shares: 10, avgCost: 100 },
      { action: "BUY", quantity: 10, price: 120 },
    );

    expect(next).toEqual({ shares: 20, avgCost: 110 });
  });

  it("reduces shares on sells without changing average cost", () => {
    const next = applyTradeToPosition(
      { shares: 20, avgCost: 110 },
      { action: "SELL", quantity: 5, price: 150 },
    );

    expect(next).toEqual({ shares: 15, avgCost: 110 });
  });

  it("clears average cost when a sell closes the position", () => {
    const next = applyTradeToPosition(
      { shares: 5, avgCost: 110 },
      { action: "SELL", quantity: 5, price: 150 },
    );

    expect(next).toEqual({ shares: 0, avgCost: null });
  });

  it("keeps existing average cost when a buy has no price", () => {
    const next = applyTradeToPosition(
      { shares: 10, avgCost: 100 },
      { action: "BUY", quantity: 5, price: null },
    );

    expect(next).toEqual({ shares: 15, avgCost: 100 });
  });

  it("throws when selling more shares than held", () => {
    expect(() =>
      applyTradeToPosition(
        { shares: 30, avgCost: 100 },
        { action: "SELL", quantity: 50, price: 110 },
        "NVDA",
      ),
    ).toThrow("Cannot sell 50 shares of NVDA: only 30 held");
  });

  it("throws when selling from an empty position", () => {
    expect(() =>
      applyTradeToPosition(
        null,
        { action: "SELL", quantity: 10, price: 100 },
        "AMD",
      ),
    ).toThrow("Cannot sell 10 shares of AMD: only 0 held");
  });

  it("throws without ticker in message when ticker is omitted", () => {
    expect(() =>
      applyTradeToPosition(
        { shares: 5, avgCost: 50 },
        { action: "SELL", quantity: 10, price: 60 },
      ),
    ).toThrow("Cannot sell 10 shares: only 5 held");
  });

  it("does not throw when selling exactly all shares (boundary)", () => {
    const next = applyTradeToPosition(
      { shares: 25, avgCost: 200 },
      { action: "SELL", quantity: 25, price: 210 },
      "TSLA",
    );

    expect(next).toEqual({ shares: 0, avgCost: null });
  });

  it("does not throw when selling fewer shares than held", () => {
    const next = applyTradeToPosition(
      { shares: 100, avgCost: 50 },
      { action: "SELL", quantity: 30, price: 55 },
    );

    expect(next).toEqual({ shares: 70, avgCost: 50 });
  });
});
