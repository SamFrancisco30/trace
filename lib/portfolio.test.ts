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

  it("keeps existing average cost when a buy has no price", () => {
    const next = applyTradeToPosition(
      { shares: 10, avgCost: 100 },
      { action: "BUY", quantity: 5, price: null },
    );

    expect(next).toEqual({ shares: 15, avgCost: 100 });
  });
});
