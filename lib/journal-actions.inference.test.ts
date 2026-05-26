import { describe, expect, it } from "vitest";

import { inferUnifiedEntry } from "./journal-actions";

describe("inferUnifiedEntry", () => {
  it("infers a buy trade with ticker, quantity, and price", async () => {
    await expect(
      inferUnifiedEntry("Bought 20 shares of NVDA at 187 because AI demand still looks strong"),
    ).resolves.toMatchObject({
      entryKind: "trade",
      tradeAction: "BUY",
      ticker: "NVDA",
      quantity: 20,
      price: 187,
    });
  });

  it("infers a sell trade from trimmed-half phrasing without mistaking HALF for ticker", async () => {
    await expect(inferUnifiedEntry("Trimmed half of TSLA")).resolves.toMatchObject({
      entryKind: "trade",
      tradeAction: "SELL",
      ticker: "TSLA",
    });
  });

  it("infers a sell trade from sold phrasing", async () => {
    await expect(inferUnifiedEntry("Sold SOXL into strength")).resolves.toMatchObject({
      entryKind: "trade",
      tradeAction: "SELL",
      ticker: "SOXL",
    });
  });

  it("infers a sell trade from scaled out phrasing", async () => {
    await expect(inferUnifiedEntry("Scaled out of AMD after the gap")).resolves.toMatchObject({
      entryKind: "trade",
      tradeAction: "SELL",
      ticker: "AMD",
    });
  });

  it("infers a buy trade from added phrasing", async () => {
    await expect(inferUnifiedEntry("Added to NVDA on the dip")).resolves.toMatchObject({
      entryKind: "trade",
      tradeAction: "BUY",
      ticker: "NVDA",
    });
  });

  it("infers a chinese buy trade", async () => {
    await expect(inferUnifiedEntry("买了20股NVDA，价格187")).resolves.toMatchObject({
      entryKind: "trade",
      tradeAction: "BUY",
      ticker: "NVDA",
      quantity: 20,
      price: 187,
    });
  });

  it("infers a chinese sell trade", async () => {
    await expect(inferUnifiedEntry("卖出TSLA一半仓位")).resolves.toMatchObject({
      entryKind: "trade",
      tradeAction: "SELL",
      ticker: "TSLA",
    });
  });

  it("does not treat advice with add wording as a trade", async () => {
    await expect(inferUnifiedEntry("Use the dip to add, not to chase the headline")).resolves.toMatchObject({
      entryKind: "prediction",
      tradeAction: null,
    });
  });

  it("does not treat conditional sell wording as a trade", async () => {
    await expect(inferUnifiedEntry("I'd sell if it loses support")).resolves.toMatchObject({
      entryKind: "prediction",
      tradeAction: null,
      predictionDirection: "down",
    });
  });

  it("treats buy the rumor sell the news as reflection instead of a trade", async () => {
    await expect(inferUnifiedEntry("buy the rumor, sell the news")).resolves.toMatchObject({
      entryKind: "reflection",
      tradeAction: null,
    });
  });

  it("infers a prediction with pullback direction", async () => {
    await expect(inferUnifiedEntry("TSLA may pull back soon")).resolves.toMatchObject({
      entryKind: "prediction",
      ticker: "TSLA",
      predictionDirection: "pullback",
    });
  });

  it("infers a breakout prediction from future-looking wording", async () => {
    await expect(
      inferUnifiedEntry("I think NVDA could break out next week"),
    ).resolves.toMatchObject({
      entryKind: "prediction",
      ticker: "NVDA",
      predictionDirection: "breakout",
    });
  });

  it("infers a bearish-looking prediction from looks weak phrasing", async () => {
    await expect(inferUnifiedEntry("AAPL looks weak here")).resolves.toMatchObject({
      entryKind: "prediction",
      ticker: "AAPL",
      predictionDirection: "down",
    });
  });

  it("infers a bullish-looking prediction from looks strong phrasing", async () => {
    await expect(inferUnifiedEntry("MSFT looks strong above 430")).resolves.toMatchObject({
      entryKind: "prediction",
      ticker: "MSFT",
      predictionDirection: "up",
    });
  });

  it("infers a chinese prediction with pullback meaning", async () => {
    await expect(inferUnifiedEntry("我觉得TSLA可能要回调了")).resolves.toMatchObject({
      entryKind: "prediction",
      ticker: "TSLA",
      predictionDirection: "pullback",
    });
  });

  it("infers a chinese prediction with breakout meaning", async () => {
    await expect(inferUnifiedEntry("NVDA这周可能突破新高")).resolves.toMatchObject({
      entryKind: "prediction",
      ticker: "NVDA",
      predictionDirection: "breakout",
    });
  });

  it("infers a reversal-style prediction", async () => {
    await expect(inferUnifiedEntry("Looks like a reversal here")).resolves.toMatchObject({
      entryKind: "prediction",
      predictionDirection: "up",
    });
  });

  it("infers a trendline reclaim prediction as bullish", async () => {
    await expect(inferUnifiedEntry("Reclaiming the trendline would be very bullish")).resolves.toMatchObject({
      entryKind: "prediction",
      predictionDirection: "up",
    });
  });

  it("infers a reflection for lesson-style notes", async () => {
    await expect(
      inferUnifiedEntry("Today I learned not to chase breakouts"),
    ).resolves.toMatchObject({
      entryKind: "reflection",
    });
  });

  it("infers a reflection for self-correction notes", async () => {
    await expect(
      inferUnifiedEntry("Need to be more patient on entries next time"),
    ).resolves.toMatchObject({
      entryKind: "reflection",
    });
  });

  it("infers a reflection for emotional notes", async () => {
    await expect(
      inferUnifiedEntry("I was too emotional today and chased strength"),
    ).resolves.toMatchObject({
      entryKind: "reflection",
    });
  });

  it("infers a chinese reflection for lesson wording", async () => {
    await expect(inferUnifiedEntry("今天学到了不要追高")).resolves.toMatchObject({
      entryKind: "reflection",
    });
  });

  it("infers a chinese reflection for emotional self-review", async () => {
    await expect(inferUnifiedEntry("今天太情绪化了，看到拉升就追")).resolves.toMatchObject({
      entryKind: "reflection",
    });
  });

  it("infers a reflection from english frustration phrasing", async () => {
    await expect(inferUnifiedEntry("This stock is frustrating")).resolves.toMatchObject({
      entryKind: "reflection",
    });
  });

  it("infers a reflection from chinese frustration phrasing", async () => {
    await expect(inferUnifiedEntry("这走势真恶心")).resolves.toMatchObject({
      entryKind: "reflection",
    });
  });

  it("infers a reflection from mixed-language fomo phrasing", async () => {
    await expect(inferUnifiedEntry("今天追了 breakout，有点 FOMO")).resolves.toMatchObject({
      entryKind: "reflection",
    });
  });
});
