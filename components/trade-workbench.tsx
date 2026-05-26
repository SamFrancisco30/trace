"use client";

import {
  useActionState,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useFormStatus } from "react-dom";

import {
  createHoldingsSnapshotEntry,
  createTradeEntry,
  type EntryFormState,
} from "@/lib/journal-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Position = {
  ticker: string;
  shares: number;
  avgCost: number | null;
};

type TradeWorkbenchProps = {
  positions: Position[];
};

const initialState: EntryFormState = {
  message: "",
  status: "idle",
};

type TradeMode = "trade" | "holdings";
type TradeAction = "BUY" | "SELL";

type HoldingRow = {
  id: string;
  ticker: string;
  shares: string;
  avgCost: string;
};

export function TradeWorkbench({ positions }: TradeWorkbenchProps) {
  const [mode, setMode] = useState<TradeMode>("trade");
  const [action, setAction] = useState<TradeAction>("BUY");
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [tradeResetKey, setTradeResetKey] = useState(0);
  const [holdingsResetKey, setHoldingsResetKey] = useState(0);

  const [tradeState, tradeActionFn] = useActionState(
    async (previousState: EntryFormState, formData: FormData) => {
      const nextState = await createTradeEntry(previousState, formData);

      if (nextState.status === "success") {
        setAction("BUY");
        setTicker("");
        setQuantity("");
        setPrice("");
        setNote("");
        setTradeResetKey((current) => current + 1);
      }

      return nextState;
    },
    initialState,
  );

  const [holdingsRows, setHoldingsRows] = useState<HoldingRow[]>(() =>
    positions.length > 0 ? positions.map(toHoldingRow) : [createEmptyHoldingRow()],
  );

  const [holdingsState, holdingsActionFn] = useActionState(
    async (previousState: EntryFormState, formData: FormData) => {
      const nextState = await createHoldingsSnapshotEntry(previousState, formData);

      if (nextState.status === "success") {
        setHoldingsRows([createEmptyHoldingRow()]);
        setHoldingsResetKey((current) => current + 1);
      }

      return nextState;
    },
    initialState,
  );

  const holdingsJson = useMemo(
    () =>
      JSON.stringify(
        holdingsRows.map((row) => ({
          ticker: row.ticker.trim().toUpperCase(),
          shares: row.shares.trim(),
          avgCost: row.avgCost.trim(),
        })),
      ),
    [holdingsRows],
  );

  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-zinc-500">Record</p>
        <h2 className="text-xl font-semibold text-black">Trades and holdings</h2>
        <p className="text-sm leading-6 text-zinc-600">
          For transactions, do not rely on AI parsing. Enter the structured facts
          directly, and keep an optional note if you want the original context.
        </p>
      </div>

      <div className="inline-flex rounded-md border border-zinc-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setMode("trade")}
          className={tabClassName(mode === "trade")}
        >
          New trade
        </button>
        <button
          type="button"
          onClick={() => setMode("holdings")}
          className={tabClassName(mode === "holdings")}
        >
          Adjust holdings
        </button>
      </div>

      {mode === "trade" ? (
        <form key={tradeResetKey} action={tradeActionFn} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">Action</span>
              <select
                name="tradeAction"
                value={action}
                onChange={(event) => setAction(event.target.value as TradeAction)}
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-black"
              >
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">Ticker</span>
              <input
                name="ticker"
                value={ticker}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
                placeholder="NVDA"
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm uppercase outline-none placeholder:text-zinc-400 focus:border-black"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">Shares</span>
              <input
                name="quantity"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                inputMode="decimal"
                placeholder="20"
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-black"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">Price (optional)</span>
              <input
                name="price"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                inputMode="decimal"
                placeholder="187"
                className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-black"
              />
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-sm font-medium text-zinc-700">Note (optional)</span>
            <Textarea
              name="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Bought 20 shares of NVDA because AI demand still looks strong"
              className="min-h-28 resize-y bg-white"
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <p className="min-h-5 text-sm text-zinc-500" aria-live="polite">
              {tradeState.message || "Structured trade entry updates holdings reliably."}
            </p>
            <TradeSubmitButton />
          </div>
        </form>
      ) : (
        <form key={holdingsResetKey} action={holdingsActionFn} className="space-y-4">
          <input type="hidden" name="positionsJson" value={holdingsJson} />

          <div className="space-y-3">
            {holdingsRows.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-[1.1fr_1fr_1fr_auto]"
              >
                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Ticker
                  </span>
                  <input
                    value={row.ticker}
                    onChange={(event) =>
                      updateHoldingRow(row.id, "ticker", event.target.value.toUpperCase(), setHoldingsRows)
                    }
                    placeholder="NVDA"
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm uppercase outline-none placeholder:text-zinc-400 focus:border-black"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Shares
                  </span>
                  <input
                    value={row.shares}
                    onChange={(event) =>
                      updateHoldingRow(row.id, "shares", event.target.value, setHoldingsRows)
                    }
                    inputMode="decimal"
                    placeholder="100"
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-black"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Avg cost
                  </span>
                  <input
                    value={row.avgCost}
                    onChange={(event) =>
                      updateHoldingRow(row.id, "avgCost", event.target.value, setHoldingsRows)
                    }
                    inputMode="decimal"
                    placeholder="145.6"
                    className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-black"
                  />
                </label>

                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-3 text-xs"
                    onClick={() => removeHoldingRow(row.id, setHoldingsRows)}
                    disabled={holdingsRows.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3 text-xs"
              onClick={() => setHoldingsRows((current) => [...current, createEmptyHoldingRow()])}
            >
              Add row
            </Button>
            <p className="text-sm text-zinc-500">
              Saving a holdings snapshot replaces the current portfolio state.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="min-h-5 text-sm text-zinc-500" aria-live="polite">
              {holdingsState.message || "Use this when the displayed portfolio is out of sync."}
            </p>
            <HoldingsSubmitButton />
          </div>
        </form>
      )}
    </section>
  );
}

function tabClassName(active: boolean) {
  return [
    "rounded px-3 py-1.5 text-sm transition-colors",
    active ? "bg-black text-white" : "text-zinc-600 hover:bg-zinc-100",
  ].join(" ");
}

function createEmptyHoldingRow(): HoldingRow {
  return {
    id: crypto.randomUUID(),
    ticker: "",
    shares: "",
    avgCost: "",
  };
}

function toHoldingRow(position: Position): HoldingRow {
  return {
    id: crypto.randomUUID(),
    ticker: position.ticker,
    shares: String(position.shares),
    avgCost: position.avgCost == null ? "" : String(position.avgCost),
  };
}

function updateHoldingRow(
  id: string,
  field: keyof Omit<HoldingRow, "id">,
  value: string,
  setRows: Dispatch<SetStateAction<HoldingRow[]>>,
) {
  setRows((current) =>
    current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
  );
}

function removeHoldingRow(
  id: string,
  setRows: Dispatch<SetStateAction<HoldingRow[]>>,
) {
  setRows((current) => {
    if (current.length === 1) {
      return current;
    }

    return current.filter((row) => row.id !== id);
  });
}

function TradeSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving" : "Save trade"}
    </Button>
  );
}

function HoldingsSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving" : "Save snapshot"}
    </Button>
  );
}
