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
): PositionState {
  const currentShares = current?.shares ?? 0;
  const currentAvgCost = current?.avgCost ?? null;

  if (trade.action === "SELL") {
    return {
      shares: Math.max(0, currentShares - trade.quantity),
      avgCost: currentAvgCost,
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
