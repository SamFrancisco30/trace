"use client";

import {
  useActionState,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useFormStatus } from "react-dom";

import {
  createHoldingsSnapshotEntry,
  createTradeEntry,
  createUnifiedEntry,
  inferUnifiedEntry,
  type ComposerState,
  type EntryKind,
  type InferredEntry,
} from "@/lib/journal-actions";
import { getRelatedEntriesForDraft } from "@/lib/related-entry-actions";
import type { RelatedEntrySuggestion } from "@/lib/related-entries";
import { RelatedEntrySuggestions } from "@/components/related-entry-suggestions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Position = {
  ticker: string;
  shares: number;
  avgCost: number | null;
};

type CaptureComposerProps = {
  positions: Position[];
};

type HoldingRow = {
  id: string;
  ticker: string;
  shares: string;
  avgCost: string;
};

const initialState: ComposerState = {
  message: "",
  status: "idle",
  inferred: null,
};

export function CaptureComposer({ positions }: CaptureComposerProps) {
  const [mode, setMode] = useState<"capture" | "holdings">("capture");

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-6">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-zinc-500">Capture</p>
        <h2 className="text-2xl font-semibold text-black">Record a trade, prediction, or note</h2>
        <p className="text-sm leading-6 text-zinc-600">
          Write naturally. Trace will infer the entry type, expose editable
          fields, and only update holdings when you save a confirmed trade.
        </p>
      </div>

      <div className="inline-flex rounded-md border border-zinc-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setMode("capture")}
          className={tabClassName(mode === "capture")}
        >
          Journal entry
        </button>
        <button
          type="button"
          onClick={() => setMode("holdings")}
          className={tabClassName(mode === "holdings")}
        >
          Adjust holdings
        </button>
      </div>

      {mode === "capture" ? (
        <UnifiedCaptureForm />
      ) : (
        <HoldingsForm positions={positions} />
      )}
    </section>
  );
}

function UnifiedCaptureForm() {
  const [rawText, setRawText] = useState("");
  const [entryKind, setEntryKind] = useState<EntryKind>("reflection");
  const [tradeAction, setTradeAction] = useState<"BUY" | "SELL">("BUY");
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [predictionDirection, setPredictionDirection] = useState("");
  const [predictionReminderDays, setPredictionReminderDays] = useState("0");
  const [lastSuggestedKind, setLastSuggestedKind] = useState<EntryKind | null>(null);
  const [savingKind, setSavingKind] = useState<EntryKind>("reflection");
  const [manualOverride, setManualOverride] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);
  const [relatedSuggestions, setRelatedSuggestions] = useState<RelatedEntrySuggestion[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  const [state, formAction] = useActionState(
    async (_previousState: ComposerState, formData: FormData) => {
      formData.set("entryKind", savingKind);
      formData.set("tradeAction", tradeAction);
      formData.set("ticker", ticker);
      formData.set("quantity", quantity);
      formData.set("price", price);
      formData.set("predictionDirection", predictionDirection);
      formData.set("predictionReminderDays", predictionReminderDays);

      const nextState =
        savingKind === "trade"
          ? await createTradeEntry(initialState, formData)
          : await createUnifiedEntry(initialState, formData);

      if (nextState.status === "success") {
        resetCaptureForm({
          setRawText,
          setEntryKind,
          setTradeAction,
          setTicker,
          setQuantity,
          setPrice,
          setPredictionDirection,
          setPredictionReminderDays,
          setLastSuggestedKind,
          setSavingKind,
          setManualOverride,
          setFormResetKey,
          setRelatedSuggestions,
          setIsLoadingRelated,
        });
      }

      return nextState;
    },
    initialState,
  );

  useEffect(() => {
    if (!rawText.trim()) {
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      const inferred = await inferUnifiedEntry(rawText);

      if (cancelled) {
        return;
      }

      setLastSuggestedKind(inferred.entryKind);

      if (!manualOverride) {
        setSavingKind(inferred.entryKind);
        hydrateFromInference(inferred, {
          setEntryKind,
          setTradeAction,
          setTicker,
          setQuantity,
          setPrice,
          setPredictionDirection,
          setPredictionReminderDays,
        });
      }

      const resolvedEntryKind = manualOverride ? entryKind : inferred.entryKind;
      const resolvedTicker = (manualOverride ? ticker : inferred.ticker ?? ticker)
        .trim()
        .toUpperCase();
      const resolvedPredictionDirection = manualOverride
        ? predictionDirection || null
        : inferred.predictionDirection;
      const hasSignal =
        rawText.trim().length >= 12 &&
        (resolvedTicker.length > 0 || resolvedEntryKind !== "trade");

      if (!hasSignal) {
        setRelatedSuggestions([]);
        setIsLoadingRelated(false);
        return;
      }

      setIsLoadingRelated(true);

      try {
        const suggestions = await getRelatedEntriesForDraft({
          rawText,
          entryKind: resolvedEntryKind,
          ticker: resolvedTicker || null,
          predictionDirection: resolvedPredictionDirection,
        });

        if (!cancelled) {
          setRelatedSuggestions(suggestions);
        }
      } catch {
        if (!cancelled) {
          setRelatedSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRelated(false);
        }
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [entryKind, manualOverride, predictionDirection, rawText, ticker]);

  const helperText =
    state.message ||
    (rawText.trim()
      ? savingKind === "trade"
        ? "Review the structured trade fields before saving."
        : savingKind === "prediction"
          ? "Set a lightweight review reminder if this is a forecast you want to revisit."
          : "Reflection entries stay text-first and lightweight."
      : "Start by writing one sentence. Trace will try to infer the type while you type.");

  return (
    <form key={formResetKey} action={formAction} className="space-y-4">
      <label className="space-y-2">
        <span className="text-sm font-medium text-zinc-700">Entry</span>
        <Textarea
          name="rawText"
          required
          value={rawText}
          onChange={(event) => {
            const nextValue = event.target.value;
            setRawText(nextValue);

            if (!nextValue.trim()) {
              setRelatedSuggestions([]);
              setIsLoadingRelated(false);
            }
          }}
          placeholder="Bought 20 shares of NVDA at 187 because AI demand still looks strong / TSLA may pull back / Today I learned not to chase breakouts"
          aria-label="Journal entry"
          className="min-h-32 resize-y bg-white"
        />
      </label>

      {rawText.trim() ? (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-zinc-700">Type</span>
              <TypePill
                active={entryKind === "trade"}
                onClick={() => {
                  setEntryKind("trade");
                  setSavingKind("trade");
                  setManualOverride(true);
                }}
                label="Trade"
              />
              <TypePill
                active={entryKind === "prediction"}
                onClick={() => {
                  setEntryKind("prediction");
                  setSavingKind("prediction");
                  setManualOverride(true);
                }}
                label="Prediction"
              />
              <TypePill
                active={entryKind === "reflection"}
                onClick={() => {
                  setEntryKind("reflection");
                  setSavingKind("reflection");
                  setManualOverride(true);
                }}
                label="Reflection"
              />
            </div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Suggested: {formatEntryKind(lastSuggestedKind ?? entryKind)}
            </p>
          </div>

          {entryKind === "trade" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Action
                </span>
                <select
                  value={tradeAction}
                  onChange={(event) => {
                    setTradeAction(event.target.value as "BUY" | "SELL");
                    setSavingKind("trade");
                    setManualOverride(true);
                  }}
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-black"
                >
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Ticker
                </span>
                <input
                  value={ticker}
                  onChange={(event) => {
                    setTicker(event.target.value.toUpperCase());
                    setSavingKind("trade");
                    setManualOverride(true);
                  }}
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm uppercase outline-none focus:border-black"
                  placeholder="NVDA"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Shares
                </span>
                <input
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(event.target.value);
                    setSavingKind("trade");
                    setManualOverride(true);
                  }}
                  inputMode="decimal"
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-black"
                  placeholder="20"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Price
                </span>
                <input
                  value={price}
                  onChange={(event) => {
                    setPrice(event.target.value);
                    setSavingKind("trade");
                    setManualOverride(true);
                  }}
                  inputMode="decimal"
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-black"
                  placeholder="187"
                />
              </label>
            </div>
          ) : entryKind === "prediction" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Ticker
                </span>
                <input
                  value={ticker}
                  onChange={(event) => {
                    setTicker(event.target.value.toUpperCase());
                    setSavingKind("prediction");
                    setManualOverride(true);
                  }}
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm uppercase outline-none focus:border-black"
                  placeholder="TSLA"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Direction
                </span>
                <select
                  value={predictionDirection}
                  onChange={(event) => {
                    setPredictionDirection(event.target.value);
                    setSavingKind("prediction");
                    setManualOverride(true);
                  }}
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-black"
                >
                  <option value="">Unspecified</option>
                  <option value="pullback">Pullback</option>
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                  <option value="breakout">Breakout</option>
                  <option value="range">Range</option>
                </select>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Review reminder
                </span>
                <select
                  value={predictionReminderDays}
                  onChange={(event) => {
                    setPredictionReminderDays(event.target.value);
                    setSavingKind("prediction");
                    setManualOverride(true);
                  }}
                  className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-black"
                >
                  <option value="0">No reminder</option>
                  <option value="3">In 3 days</option>
                  <option value="7">In 1 week</option>
                  <option value="14">In 2 weeks</option>
                </select>
              </label>
            </div>
          ) : (
            <p className="text-sm leading-6 text-zinc-600">
              Reflection entries stay intentionally lightweight. Save the original
              text as-is and keep moving.
            </p>
          )}
        </div>
      ) : null}

      <RelatedEntrySuggestions
        loading={isLoadingRelated}
        suggestions={relatedSuggestions}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-h-5 text-sm text-zinc-500" aria-live="polite">
          {helperText}
        </p>
        <SaveButton
          disabled={!rawText.trim()}
          label={
            savingKind === "trade"
              ? "Save trade"
              : savingKind === "prediction"
                ? "Save prediction"
                : "Save reflection"
          }
        />
      </div>
    </form>
  );
}

function HoldingsForm({ positions }: { positions: Position[] }) {
  const [holdingsRows, setHoldingsRows] = useState<HoldingRow[]>(() =>
    positions.length > 0 ? positions.map(toHoldingRow) : [createEmptyHoldingRow()],
  );
  const [resetKey, setResetKey] = useState(0);

  const [state, formAction] = useActionState(
    async (_previousState: ComposerState, formData: FormData) => {
      const nextState = await createHoldingsSnapshotEntry(initialState, formData);

      if (nextState.status === "success") {
        setHoldingsRows([createEmptyHoldingRow()]);
        setResetKey((current) => current + 1);
      }

      return nextState;
    },
    initialState,
  );

  return (
    <form key={resetKey} action={formAction} className="space-y-4">
      <input
        type="hidden"
        name="positionsJson"
        value={JSON.stringify(
          holdingsRows.map((row) => ({
            ticker: row.ticker.trim().toUpperCase(),
            shares: row.shares.trim(),
            avgCost: row.avgCost.trim(),
          })),
        )}
      />

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
          {state.message || "Use this when the displayed portfolio is out of sync."}
        </p>
        <SaveButton label="Save snapshot" />
      </div>
    </form>
  );
}

function SaveButton({
  label,
  disabled,
}: {
  label: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? "Saving" : label}
    </Button>
  );
}

function TypePill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-black bg-black text-white"
          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100",
      ].join(" ")}
    >
      {label}
    </button>
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

function hydrateFromInference(
  inferred: InferredEntry,
  setters: {
    setEntryKind: Dispatch<SetStateAction<EntryKind>>;
    setTradeAction: Dispatch<SetStateAction<"BUY" | "SELL">>;
    setTicker: Dispatch<SetStateAction<string>>;
    setQuantity: Dispatch<SetStateAction<string>>;
    setPrice: Dispatch<SetStateAction<string>>;
    setPredictionDirection: Dispatch<SetStateAction<string>>;
    setPredictionReminderDays: Dispatch<SetStateAction<string>>;
  },
) {
  setters.setEntryKind(inferred.entryKind);
  setters.setTicker(inferred.ticker ?? "");

  if (inferred.entryKind === "trade") {
    setters.setTradeAction(inferred.tradeAction ?? "BUY");
    setters.setQuantity(inferred.quantity == null ? "" : String(inferred.quantity));
    setters.setPrice(inferred.price == null ? "" : String(inferred.price));
    setters.setPredictionDirection("");
    setters.setPredictionReminderDays("0");
    return;
  }

  if (inferred.entryKind === "prediction") {
    setters.setTradeAction("BUY");
    setters.setQuantity("");
    setters.setPrice("");
    setters.setPredictionDirection(inferred.predictionDirection ?? "");
    setters.setPredictionReminderDays(
      inferred.predictionReminderDays == null
        ? "0"
        : String(inferred.predictionReminderDays),
    );
    return;
  }

  setters.setTradeAction("BUY");
  setters.setQuantity("");
  setters.setPrice("");
  setters.setPredictionDirection("");
  setters.setPredictionReminderDays("0");
}

function resetCaptureForm(setters: {
  setRawText: Dispatch<SetStateAction<string>>;
  setEntryKind: Dispatch<SetStateAction<EntryKind>>;
  setTradeAction: Dispatch<SetStateAction<"BUY" | "SELL">>;
  setTicker: Dispatch<SetStateAction<string>>;
  setQuantity: Dispatch<SetStateAction<string>>;
  setPrice: Dispatch<SetStateAction<string>>;
  setPredictionDirection: Dispatch<SetStateAction<string>>;
  setPredictionReminderDays: Dispatch<SetStateAction<string>>;
  setLastSuggestedKind: Dispatch<SetStateAction<EntryKind | null>>;
  setSavingKind: Dispatch<SetStateAction<EntryKind>>;
  setManualOverride: Dispatch<SetStateAction<boolean>>;
  setFormResetKey: Dispatch<SetStateAction<number>>;
  setRelatedSuggestions: Dispatch<SetStateAction<RelatedEntrySuggestion[]>>;
  setIsLoadingRelated: Dispatch<SetStateAction<boolean>>;
}) {
  setters.setRawText("");
  setters.setEntryKind("reflection");
  setters.setTradeAction("BUY");
  setters.setTicker("");
  setters.setQuantity("");
  setters.setPrice("");
  setters.setPredictionDirection("");
  setters.setPredictionReminderDays("0");
  setters.setLastSuggestedKind(null);
  setters.setSavingKind("reflection");
  setters.setManualOverride(false);
  setters.setRelatedSuggestions([]);
  setters.setIsLoadingRelated(false);
  setters.setFormResetKey((current) => current + 1);
}

function formatEntryKind(value: EntryKind) {
  if (value === "trade") return "Trade";
  if (value === "prediction") return "Prediction";
  return "Reflection";
}
