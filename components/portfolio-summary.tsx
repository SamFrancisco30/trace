type PortfolioPosition = {
  ticker: string;
  shares: number;
  avgCost: number | null;
};

export function PortfolioSummary({
  positions,
}: {
  positions: PortfolioPosition[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between border-b border-zinc-200 pb-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Portfolio
        </h2>
        <span className="text-sm text-zinc-500">
          {positions.length} positions
        </span>
      </div>

      {positions.length === 0 ? (
        <p className="text-sm leading-6 text-zinc-500">
          Parsed buy and sell entries will update positions here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2 font-medium">Ticker</th>
                <th className="py-2 text-right font-medium">Shares</th>
                <th className="py-2 text-right font-medium">Avg cost</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.ticker} className="border-b border-zinc-100">
                  <td className="py-3 font-medium">{position.ticker}</td>
                  <td className="py-3 text-right tabular-nums">
                    {formatNumber(position.shares)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {position.avgCost == null
                      ? "-"
                      : formatCurrency(position.avgCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
    currency: "USD",
  }).format(value);
}
