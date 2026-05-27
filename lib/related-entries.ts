export type DraftContext = {
  rawText: string;
  entryKind: "trade" | "prediction" | "reflection";
  ticker: string | null;
  predictionDirection: string | null;
};

export type RelatedEntrySuggestion = {
  id: string;
  createdAt: Date;
  rawText: string;
  entryKind: "trade" | "prediction" | "reflection" | "unknown";
  ticker: string | null;
  predictionDirection: string | null;
  matchReason:
    | "same_ticker"
    | "same_kind"
    | "contrasting_prediction"
    | "recent_relevant";
  score: number;
};

type CandidateEvent = {
  id: string;
  createdAt: Date;
  rawText: string;
  parsedData: unknown;
};

type ParsedMetadata = {
  action?: string;
  tickers?: string[];
  tags?: string[];
};

export function findRelatedEntries(
  draft: DraftContext,
  events: CandidateEvent[],
): RelatedEntrySuggestion[] {
  return events
    .map((event) => toSuggestion(draft, event))
    .filter((suggestion) => suggestion.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

function toSuggestion(
  draft: DraftContext,
  event: CandidateEvent,
): RelatedEntrySuggestion {
  const parsed = toParsedMetadata(event.parsedData);
  const entryKind = inferEntryKind(parsed);
  const ticker = parsed.tickers?.[0]?.toUpperCase() ?? null;
  const predictionDirection = extractPredictionDirection(parsed.tags ?? []);

  let score = 0;

  if (draft.ticker && ticker === draft.ticker) {
    score += 100;
  }

  if (entryKind === draft.entryKind) {
    score += 25;
  }

  if (draft.entryKind === "prediction" && entryKind === "prediction") {
    score += 20;
  }

  if (
    draft.predictionDirection &&
    predictionDirection &&
    draft.predictionDirection !== predictionDirection
  ) {
    score += 15;
  }

  score += recencyBonus(event.createdAt);

  return {
    id: event.id,
    createdAt: event.createdAt,
    rawText: event.rawText,
    entryKind,
    ticker,
    predictionDirection,
    matchReason: determineMatchReason(draft, { entryKind, ticker, predictionDirection }),
    score,
  };
}

function toParsedMetadata(value: unknown): ParsedMetadata {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as ParsedMetadata;
}

function inferEntryKind(parsed: ParsedMetadata): RelatedEntrySuggestion["entryKind"] {
  const tags = parsed.tags ?? [];

  if (parsed.action === "BUY" || parsed.action === "SELL" || tags.includes("trade")) {
    return "trade";
  }

  if (parsed.action === "WATCH" || tags.includes("prediction")) {
    return "prediction";
  }

  if (parsed.action === "NOTE" || tags.includes("reflection")) {
    return "reflection";
  }

  return "unknown";
}

function extractPredictionDirection(tags: string[]) {
  const directionTag = tags.find((tag) => tag.startsWith("direction:"));
  return directionTag?.split(":")[1] ?? null;
}

function determineMatchReason(
  draft: DraftContext,
  candidate: {
    entryKind: RelatedEntrySuggestion["entryKind"];
    ticker: string | null;
    predictionDirection: string | null;
  },
): RelatedEntrySuggestion["matchReason"] {
  if (
    draft.entryKind === "prediction" &&
    candidate.entryKind === "prediction" &&
    draft.predictionDirection &&
    candidate.predictionDirection &&
    draft.predictionDirection !== candidate.predictionDirection
  ) {
    return "contrasting_prediction";
  }

  if (draft.ticker && candidate.ticker === draft.ticker) {
    return "same_ticker";
  }

  if (candidate.entryKind === draft.entryKind) {
    return "same_kind";
  }

  return "recent_relevant";
}

function recencyBonus(createdAt: Date) {
  const ageInDays = Math.max(
    0,
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(0, 10 - ageInDays / 30);
}
