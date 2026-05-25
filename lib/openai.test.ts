import { beforeEach, describe, expect, it, vi } from "vitest";

const { parseMock, openaiConstructorMock } = vi.hoisted(() => {
  const parseMock = vi.fn();
  const openaiConstructorMock = vi.fn(function (this: unknown) {
    return {
      responses: {
        parse: parseMock,
      },
    };
  });

  return { parseMock, openaiConstructorMock };
});

vi.mock("openai", () => ({
  default: openaiConstructorMock,
}));

import { parseJournalEntry } from "./openai";

describe("parseJournalEntry", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    parseMock.mockReset();
    openaiConstructorMock.mockClear();
  });

  it("returns fallback metadata when no api key is configured", async () => {
    await expect(parseJournalEntry("Bought 20 shares of NVDA at 187")).resolves.toEqual(
      {
        tickers: [],
        action: "UNKNOWN",
        quantity: null,
        price: null,
        sentiment: "UNKNOWN",
        tags: [],
        positions: [],
      },
    );

    expect(openaiConstructorMock).not.toHaveBeenCalled();
  });

  it("delegates parsing to OpenAI when an api key is configured", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_MODEL = "gpt-4.1-mini";

    parseMock.mockResolvedValue({
      output_parsed: {
        tickers: ["CRCG"],
        action: "HOLDINGS",
        quantity: null,
        price: null,
        sentiment: "NEUTRAL",
        tags: ["holdings_snapshot"],
        positions: [{ ticker: "CRCG", shares: 150, avgCost: 34.57 }],
      },
    });

    await expect(
      parseJournalEntry("我当前的持仓：CRCG：150，成本34.57"),
    ).resolves.toEqual({
      tickers: ["CRCG"],
      action: "HOLDINGS",
      quantity: null,
      price: null,
      sentiment: "NEUTRAL",
      tags: ["holdings_snapshot"],
      positions: [{ ticker: "CRCG", shares: 150, avgCost: 34.57 }],
    });

    expect(openaiConstructorMock).toHaveBeenCalledWith({ apiKey: "sk-test" });
    expect(parseMock).toHaveBeenCalledTimes(1);
  });
});
