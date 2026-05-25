export type TradeAction = "BUY" | "SELL";

export type PositionState = {
  shares: number;
  avgCost: number | null;
};

export type ParsedTrade = {
  action: TradeAction;
  quantity: number;
  price: number | null;
};

export function applyTradeToPosition(
  current: PositionState | null,
  trade: ParsedTrade,
  ticker?: string,
): PositionState {
  const currentShares = current?.shares ?? 0;
  const currentAvgCost = current?.avgCost ?? null;

  if (trade.action === "SELL") {
    if (trade.quantity > currentShares) {
      const label = ticker ? ` of ${ticker}` : "";
      throw new Error(
        `Cannot sell ${trade.quantity} shares${label}: only ${currentShares} held`,
      );
    }

    const nextShares = currentShares - trade.quantity;

    return {
      shares: nextShares,
      avgCost: nextShares === 0 ? null : currentAvgCost,
    };
  }

  const nextShares = currentShares + trade.quantity;

  if (trade.price == null) {
    return {
      shares: nextShares,
      avgCost: currentAvgCost,
    };
  }

  if (currentShares === 0 || currentAvgCost == null) {
    return {
      shares: nextShares,
      avgCost: trade.price,
    };
  }

  return {
    shares: nextShares,
    avgCost:
      (currentShares * currentAvgCost + trade.quantity * trade.price) /
      nextShares,
  };
}
