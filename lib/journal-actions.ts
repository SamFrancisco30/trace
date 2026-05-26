"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { parseJournalEntry, type ParsedEntry } from "@/lib/openai";
import { rebuildPortfolioPositions } from "@/lib/portfolio-state";

export type EntryKind = "trade" | "prediction" | "reflection";

export type InferredEntry = {
  entryKind: EntryKind;
  ticker: string | null;
  tradeAction: "BUY" | "SELL" | null;
  quantity: number | null;
  price: number | null;
  predictionDirection: string | null;
  predictionReminderDays: number | null;
};

export type ComposerState = {
  message: string;
  status: "idle" | "error" | "success";
  inferred: InferredEntry | null;
};

export type EntryFormState = ComposerState;

type StructuredHoldingInput = {
  ticker: string;
  shares: string;
  avgCost: string;
};

export async function createJournalEntry(
  _previousState: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  return createUnifiedEntry(_previousState, formData);
}

export async function createUnifiedEntry(
  _previousState: ComposerState,
  formData: FormData,
): Promise<ComposerState> {
  const rawText = String(formData.get("rawText") ?? "").trim();
  const intent = String(formData.get("intent") ?? "save").trim();

  if (!rawText) {
    return {
      message: "Write an entry first.",
      status: "error",
      inferred: null,
    };
  }

  const inferred = inferEntry(rawText);

  if (intent === "analyze") {
    return {
      message: "Inference ready.",
      status: "success",
      inferred,
    };
  }

  const entryKind = normalizeEntryKind(formData.get("entryKind"), inferred.entryKind);

  if (entryKind === "trade") {
    return {
      message: "Trades should be saved through the structured trade flow.",
      status: "error",
      inferred,
    };
  }

  const parsed = await parseEntrySafely(rawText);
  const ticker = normalizeOptionalText(formData.get("ticker"));
  const predictionDirection = normalizeOptionalText(
    formData.get("predictionDirection"),
  );
  const predictionReminderDays = normalizeReminderDays(
    formData.get("predictionReminderDays"),
  );

  const tags = new Set(parsed.tags ?? []);
  tags.add(entryKind === "prediction" ? "prediction" : "reflection");

  if (predictionDirection) {
    tags.add(`direction:${predictionDirection}`);
  }

  if (predictionReminderDays && predictionReminderDays > 0) {
    tags.add(`reminder:${predictionReminderDays}d`);
  }

  const mergedParsed: ParsedEntry = {
    ...parsed,
    tickers: ticker ? [ticker] : parsed.tickers,
    action: entryKind === "prediction" ? "WATCH" : "NOTE",
    quantity: null,
    price: null,
    sentiment: parsed.sentiment,
    tags: [...tags],
    positions: [],
  };

  try {
    await prisma.event.create({
      data: {
        rawText,
        parsedData: mergedParsed,
      },
    });
  } catch (error) {
    return {
      message: getEntryErrorMessage(error, "Could not save entry."),
      status: "error",
      inferred,
    };
  }

  revalidatePath("/");

  return {
    message:
      entryKind === "prediction"
        ? predictionReminderDays && predictionReminderDays > 0
          ? `Prediction saved. Review in ${predictionReminderDays} day${predictionReminderDays > 1 ? "s" : ""}.`
          : "Prediction saved."
        : "Reflection saved.",
    status: "success",
    inferred,
  };
}

export async function createTradeEntry(
  _previousState: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const action = String(formData.get("tradeAction") ?? "").trim().toUpperCase();
  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const quantityText = String(formData.get("quantity") ?? "").trim();
  const priceText = String(formData.get("price") ?? "").trim();
  const rawText = String(formData.get("rawText") ?? "").trim();

  if (action !== "BUY" && action !== "SELL") {
    return {
      message: "Choose buy or sell.",
      status: "error",
      inferred: null,
    };
  }

  if (!ticker) {
    return {
      message: "Ticker is required.",
      status: "error",
      inferred: null,
    };
  }

  const quantity = Number(quantityText);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      message: "Shares must be greater than 0.",
      status: "error",
      inferred: null,
    };
  }

  let price: number | null = null;
  if (priceText) {
    price = Number(priceText);
    if (!Number.isFinite(price) || price <= 0) {
      return {
        message: "Price must be greater than 0 if provided.",
        status: "error",
        inferred: null,
      };
    }
  }

  const finalRawText = rawText || buildTradeRawText({ action, ticker, quantity, price });
  const parsed: ParsedEntry = {
    tickers: [ticker],
    action,
    quantity,
    price,
    sentiment: "UNKNOWN",
    tags: ["structured_trade", "trade"],
    positions: [],
  };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.event.create({
        data: {
          rawText: finalRawText,
          parsedData: parsed,
        },
      });

      await syncPortfolioFromActiveEvents(tx);
    });
  } catch (error) {
    return {
      message: getEntryErrorMessage(error, "Could not save trade."),
      status: "error",
      inferred: null,
    };
  }

  revalidatePath("/");

  return {
    message: "Trade saved.",
    status: "success",
    inferred: null,
  };
}

export async function createHoldingsSnapshotEntry(
  _previousState: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const positionsJson = String(formData.get("positionsJson") ?? "[]");

  let inputRows: StructuredHoldingInput[];
  try {
    inputRows = JSON.parse(positionsJson) as StructuredHoldingInput[];
  } catch {
    return {
      message: "Could not read holdings rows.",
      status: "error",
      inferred: null,
    };
  }

  const positions = [] as ParsedEntry["positions"];

  for (const row of inputRows) {
    const ticker = String(row?.ticker ?? "").trim().toUpperCase();
    const sharesText = String(row?.shares ?? "").trim();
    const avgCostText = String(row?.avgCost ?? "").trim();

    if (!ticker && !sharesText && !avgCostText) {
      continue;
    }

    if (!ticker) {
      return {
        message: "Every holdings row needs a ticker.",
        status: "error",
        inferred: null,
      };
    }

    const shares = Number(sharesText);
    if (!Number.isFinite(shares) || shares <= 0) {
      return {
        message: `Shares for ${ticker} must be greater than 0.`,
        status: "error",
        inferred: null,
      };
    }

    let avgCost: number | null = null;
    if (avgCostText) {
      avgCost = Number(avgCostText);
      if (!Number.isFinite(avgCost) || avgCost <= 0) {
        return {
          message: `Average cost for ${ticker} must be greater than 0 if provided.`,
          status: "error",
          inferred: null,
        };
      }
    }

    positions.push({ ticker, shares, avgCost });
  }

  const parsed: ParsedEntry = {
    tickers: positions.map((position) => position.ticker),
    action: "HOLDINGS",
    quantity: null,
    price: null,
    sentiment: "NEUTRAL",
    tags: ["holdings_snapshot", "structured_holdings"],
    positions,
  };

  const rawText =
    positions.length === 0
      ? "Holdings snapshot cleared"
      : `Holdings snapshot: ${positions
          .map(
            (position) =>
              `${position.ticker} ${formatNumber(position.shares)}${
                position.avgCost == null ? "" : ` @ ${formatNumber(position.avgCost)}`
              }`,
          )
          .join(", ")}`;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.event.create({
        data: {
          rawText,
          parsedData: parsed,
        },
      });

      await syncPortfolioFromActiveEvents(tx);
    });
  } catch (error) {
    return {
      message: getEntryErrorMessage(error, "Could not save holdings snapshot."),
      status: "error",
      inferred: null,
    };
  }

  revalidatePath("/");

  return {
    message: "Holdings snapshot saved.",
    status: "success",
    inferred: null,
  };
}

export async function updateJournalEntry(
  _previousState: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const eventId = String(formData.get("eventId") ?? "").trim();
  const rawText = String(formData.get("rawText") ?? "").trim();

  if (!eventId) {
    return {
      message: "Missing entry id.",
      status: "error",
      inferred: null,
    };
  }

  if (!rawText) {
    return {
      message: "Write an entry first.",
      status: "error",
      inferred: null,
    };
  }

  const parsed = await parseEntrySafely(rawText);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: {
          rawText,
          parsedData: parsed,
        },
      });

      await syncPortfolioFromActiveEvents(tx);
    });
  } catch (error) {
    return {
      message: getEntryErrorMessage(error, "Could not update entry."),
      status: "error",
      inferred: null,
    };
  }

  revalidatePath("/");

  return {
    message: "Entry updated.",
    status: "success",
    inferred: null,
  };
}

export async function deleteJournalEntry(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "").trim();

  if (!eventId) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: {
        deletedAt: new Date(),
      },
    });

    await syncPortfolioFromActiveEvents(tx);
  });

  revalidatePath("/");
}

async function parseEntrySafely(rawText: string): Promise<ParsedEntry> {
  try {
    return await parseJournalEntry(rawText);
  } catch {
    return {
      tickers: [],
      action: "UNKNOWN",
      quantity: null,
      price: null,
      sentiment: "UNKNOWN",
      tags: ["parse_error"],
      positions: [],
    };
  }
}

async function syncPortfolioFromActiveEvents(tx: Prisma.TransactionClient) {
  const events = await tx.event.findMany({
    where: { deletedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const positions = rebuildPortfolioPositions(events);

  await tx.portfolioPosition.deleteMany();

  if (positions.length > 0) {
    await tx.portfolioPosition.createMany({
      data: positions.map((position) => ({
        ticker: position.ticker,
        shares: position.shares,
        avgCost: position.avgCost,
      })),
    });
  }
}

export async function inferUnifiedEntry(rawText: string): Promise<InferredEntry> {
  return inferEntry(rawText);
}

function inferEntry(rawText: string): InferredEntry {
  const numberMatches = rawText.match(/\d+(?:\.\d+)?/g) ?? [];
  const quantity = numberMatches[0] ? Number(numberMatches[0]) : null;
  const price = numberMatches[1] ? Number(numberMatches[1]) : null;

  if (/(fomo|情绪化|不要追高|学到|教训|反思|frustrating|恶心|头疼|painful)/i.test(rawText)) {
    return {
      entryKind: "reflection",
      ticker: extractTicker(rawText),
      tradeAction: null,
      quantity: null,
      price: null,
      predictionDirection: null,
      predictionReminderDays: null,
    };
  }

  if (isTradeText(rawText)) {
    const tradeAction = isSellText(rawText) ? "SELL" : "BUY";

    return {
      entryKind: "trade",
      ticker: extractTicker(rawText),
      tradeAction,
      quantity,
      price,
      predictionDirection: null,
      predictionReminderDays: null,
    };
  }

  if (isPredictionText(rawText)) {
    return {
      entryKind: "prediction",
      ticker: extractTicker(rawText),
      tradeAction: null,
      quantity: null,
      price: null,
      predictionDirection: inferPredictionDirection(rawText),
      predictionReminderDays: null,
    };
  }

  return {
    entryKind: "reflection",
    ticker: extractTicker(rawText),
    tradeAction: null,
    quantity: null,
    price: null,
    predictionDirection: null,
    predictionReminderDays: null,
  };
}

function isTradeText(rawText: string) {
  if (/(buy the rumor|sell the news)/i.test(rawText)) {
    return false;
  }

  if (/(\bif\b|\bwould\b|\bshould\b|\bcould\b|\bmay\b|\bmight\b|\bprobably\b|\blet'?s see\b|感觉|觉得|可能|如果|fomo)/i.test(rawText)) {
    return false;
  }

  if (/(use the dip to add|not to chase|not chasing|watching|looking for|plan to|planning to)/i.test(rawText)) {
    return false;
  }

  return /(\bbought\b|\badd(ed)?\b|买了|买入|加仓了|加了|补了|清仓了|卖了|卖出|减了|减仓|trimmed|sold|scaled in|scaled out|cut|closed|exit(ed)?)/i.test(
    rawText,
  );
}

function isSellText(rawText: string) {
  return /(卖了|卖出|减了|减仓|trimmed|sold|scaled out|cut|closed|exit(ed)?|清仓了)/i.test(
    rawText,
  );
}

function isPredictionText(rawText: string) {
  if (/(learned|lesson|realized|journal|note to self|反思|教训|学到)/i.test(rawText)) {
    return false;
  }

  return /(\bif\b|if it|loses support|use the dip|可能|觉得|会|如果|回调|突破|pull\s*back|pull\s+back|break\s*out|break\s+out|likely|probably|should|might|may|could|would|watching|reversal|reverse here|rolls? over|trendline|vwap|bullish|bearish|dead money|looks\s+(weak|strong))/i.test(
    rawText,
  );
}

function extractTicker(rawText: string): string | null {
  const upper = rawText.toUpperCase();
  const stopWords = new Set([
    "OF",
    "AT",
    "AND",
    "THE",
    "A",
    "I",
    "TO",
    "IN",
    "ON",
    "HALF",
    "FULL",
    "TRIM",
    "TRIMMED",
    "BOUGHT",
    "SOLD",
    "SELL",
    "BUY",
    "ADD",
    "ADDED",
    "TODAY",
    "THINK",
    "MAY",
    "WILL",
    "BACK",
    "SOON",
    "NEXT",
    "WEEK",
    "LOOKS",
    "WEAK",
    "STRONG",
    "SHARES",
    "INTO",
  ]);

  const patterns = [
    /(?:SHARES OF|OF)\s+([A-Z]{1,5})\b/,
    /(?:SOLD|SELL|BOUGHT|BUY|TRIMMED|ADD(?:ED)?|CUT|CLOSED|EXIT(?:ED)?|SCALED IN|SCALED OUT)\s+([A-Z]{1,5})\b/,
    /\b([A-Z]{1,5})\s+(?:MAY|MIGHT|COULD|WILL|LIKELY|PROBABLY|LOOKS|IS)\b/,
  ];

  for (const pattern of patterns) {
    const match = upper.match(pattern);
    const candidate = match?.[1] ?? null;
    if (candidate && !stopWords.has(candidate)) {
      return candidate;
    }
  }

  const tokens = upper.match(/\b[A-Z]{1,5}\b/g) ?? [];
  for (const token of tokens) {
    if (!stopWords.has(token)) {
      return token;
    }
  }

  return null;
}

function inferPredictionDirection(rawText: string) {
  if (/(回调|pullback|pull\s+back|dip)/i.test(rawText)) return "pullback";
  if (/(rolls? over|looks\s+weak|下跌|down|lower|bearish|跌破|loses support)/i.test(rawText)) return "down";
  if (/(突破|breakout|break\s+out)/i.test(rawText)) return "breakout";
  if (/(reversal|reverse here|reclaim(ing)?|bullish|looks\s+strong|上涨|up|higher)/i.test(rawText)) return "up";
  if (/(震荡|range|sideways|dead money)/i.test(rawText)) return "range";
  return null;
}

function normalizeEntryKind(value: FormDataEntryValue | null, fallback: EntryKind): EntryKind {
  const normalized = String(value ?? "").trim();
  if (normalized === "trade" || normalized === "prediction" || normalized === "reflection") {
    return normalized;
  }
  return fallback;
}

function normalizeOptionalText(value: FormDataEntryValue | null, fallback = "") {
  const normalized = String(value ?? fallback).trim().toUpperCase();
  return normalized || null;
}

function normalizeReminderDays(value: FormDataEntryValue | null) {
  const normalized = Number(String(value ?? "0").trim());
  if (!Number.isFinite(normalized) || normalized < 0) {
    return 0;
  }
  return normalized;
}

function buildTradeRawText({
  action,
  ticker,
  quantity,
  price,
}: {
  action: "BUY" | "SELL";
  ticker: string;
  quantity: number;
  price: number | null;
}) {
  const verb = action === "BUY" ? "Bought" : "Sold";
  return `${verb} ${formatNumber(quantity)} shares of ${ticker}${
    price == null ? "" : ` at ${formatNumber(price)}`
  }`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value);
}

function getEntryErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
