import { applyTradeToPosition, type PositionState } from "./portfolio";

type ParsedPosition = {
  ticker: string;
  shares: number;
  avgCost: number | null;
};

type ParsedTimelineEntry = {
  action?: string;
  tickers?: string[];
  quantity?: number | null;
  price?: number | null;
  positions?: ParsedPosition[];
};

type TimelineEntryLike = {
  parsedData: unknown;
};

export type PortfolioSnapshotPosition = {
  ticker: string;
  shares: number;
  avgCost: number | null;
};

export function rebuildPortfolioPositions(
  events: TimelineEntryLike[],
): PortfolioSnapshotPosition[] {
  const positions = new Map<string, PositionState>();

  for (const event of events) {
    const parsed = toParsedTimelineEntry(event.parsedData);

    if (!parsed) {
      continue;
    }

    if (parsed.action === "HOLDINGS" && parsed.positions?.length) {
      positions.clear();

      for (const position of parsed.positions) {
        const ticker = position.ticker.trim().toUpperCase();

        if (!ticker || position.shares <= 0) {
          continue;
        }

        positions.set(ticker, {
          shares: position.shares,
          avgCost: position.avgCost,
        });
      }

      continue;
    }

    const ticker = parsed.tickers?.[0]?.trim().toUpperCase();

    if (
      !ticker ||
      (parsed.action !== "BUY" && parsed.action !== "SELL") ||
      parsed.quantity == null
    ) {
      continue;
    }

    const next = applyTradeToPosition(
      positions.get(ticker) ?? null,
      {
        action: parsed.action,
        quantity: parsed.quantity,
        price: parsed.price ?? null,
      },
      ticker,
    );

    if (next.shares <= 0) {
      positions.delete(ticker);
      continue;
    }

    positions.set(ticker, next);
  }

  return [...positions.entries()]
    .sort(([leftTicker], [rightTicker]) => leftTicker.localeCompare(rightTicker))
    .map(([ticker, position]) => ({
      ticker,
      shares: position.shares,
      avgCost: position.avgCost,
    }));
}

function toParsedTimelineEntry(value: unknown): ParsedTimelineEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as ParsedTimelineEntry;
}
