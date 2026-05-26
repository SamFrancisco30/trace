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
    <section className="space-y-4">
      <div className="space-y-2 border-b border-zinc-200 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Holdings
          </h2>
          <span className="text-sm text-zinc-500">
            {positions.length} {positions.length === 1 ? "position" : "positions"}
          </span>
        </div>
        <p className="text-sm leading-6 text-zinc-600">
          Current positions derived from saved trades and holdings snapshots.
        </p>
      </div>

      {positions.length === 0 ? (
        <div className="space-y-2 text-sm leading-6 text-zinc-500">
          <p>No current holdings yet. Saved trades will update this view.</p>
          <p>If your portfolio is out of sync, use Adjust holdings above.</p>
        </div>
      ) : (
        <div className="space-y-3">
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
                        ? "—"
                        : formatCurrency(position.avgCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs leading-5 text-zinc-500">
            Need to reconcile? Use Adjust holdings above.
          </p>
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
