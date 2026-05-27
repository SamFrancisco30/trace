import type { RelatedEntrySuggestion } from "@/lib/related-entries";

type RelatedEntrySuggestionsProps = {
  loading: boolean;
  suggestions: RelatedEntrySuggestion[];
};

export function RelatedEntrySuggestions({
  loading,
  suggestions,
}: RelatedEntrySuggestionsProps) {
  if (!loading && suggestions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-700">Related history</h3>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-zinc-500">Looking through your history…</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id} className="border-l border-zinc-200 pl-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {formatDate(suggestion.createdAt)}
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-800">
                {suggestion.rawText}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {buildLabel(suggestion)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function buildLabel(suggestion: RelatedEntrySuggestion) {
  const parts = [
    humanizeEntryKind(suggestion.entryKind),
    suggestion.ticker,
    humanizePredictionDirection(suggestion.predictionDirection),
  ].filter(Boolean);

  return parts.join(" · ");
}

function humanizeEntryKind(value: RelatedEntrySuggestion["entryKind"]) {
  if (value === "trade") return "Trade";
  if (value === "prediction") return "Prediction";
  if (value === "reflection") return "Reflection";
  return "Entry";
}

function humanizePredictionDirection(value: string | null) {
  if (!value) {
    return null;
  }

  if (value === "pullback") return "Pullback";
  if (value === "breakout") return "Breakout";
  if (value === "up") return "Up";
  if (value === "down") return "Down";
  if (value === "range") return "Range";

  return value;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
