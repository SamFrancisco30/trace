import { TimelineEntryActions } from "@/components/timeline-entry-actions";

type TimelineEntry = {
  id: string;
  createdAt: Date;
  rawText: string;
  parsedData: unknown;
};

type ParsedMetadata = {
  tickers?: string[];
  action?: string;
  quantity?: number | null;
  price?: number | null;
  tags?: string[];
};

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline justify-between border-b border-zinc-200 pb-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Timeline
        </h2>
        <span className="text-sm text-zinc-500">
          {entries.length} entries
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm leading-6 text-zinc-500">
          Your first saved thought will appear here.
        </p>
      ) : (
        <ol className="divide-y divide-zinc-200">
          {entries.map((entry) => {
            const metadata = toMetadata(entry.parsedData);

            return (
              <li key={entry.id} className="px-4 py-5 sm:px-5 sm:py-6">
                <time className="text-xs uppercase tracking-wide text-zinc-500">
                  {formatDate(entry.createdAt)}
                </time>
                <p className="mt-2 text-lg leading-8 text-black">
                  {entry.rawText}
                </p>
                <Metadata metadata={metadata} />
                <TimelineEntryActions entryId={entry.id} rawText={entry.rawText} />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Metadata({ metadata }: { metadata: ParsedMetadata }) {
  const items = buildDisplayItems(metadata);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function buildDisplayItems(metadata: ParsedMetadata) {
  const tags = metadata.tags ?? [];
  const tickers = metadata.tickers?.filter(Boolean) ?? [];
  const action = metadata.action ?? "";

  const isPrediction = tags.includes("prediction") || action === "WATCH";
  const isReflection = tags.includes("reflection") || action === "NOTE";
  const isTrade = action === "BUY" || action === "SELL";

  if (isTrade) {
    return [action, tickers[0] ?? null].filter(Boolean) as string[];
  }

  if (isPrediction) {
    return [
      "Prediction",
      tickers[0] ?? null,
      humanizeDirection(tags),
      humanizeReminder(tags),
    ].filter(Boolean) as string[];
  }

  if (isReflection) {
    return ["Reflection", tickers[0] ?? null].filter(Boolean) as string[];
  }

  return tickers.slice(0, 1);
}

function humanizeDirection(tags: string[]) {
  const directionTag = tags.find((tag) => tag.startsWith("direction:"));
  const direction = directionTag?.split(":")[1];

  switch (direction) {
    case "breakout":
      return "Breakout";
    case "pullback":
      return "Pullback";
    case "up":
      return "Up";
    case "down":
      return "Down";
    case "range":
      return "Range";
    default:
      return null;
  }
}

function humanizeReminder(tags: string[]) {
  const reminderTag = tags.find((tag) => tag.startsWith("reminder:"));
  const value = reminderTag?.split(":")[1];

  if (!value) {
    return null;
  }

  return `Review in ${value}`;
}

function toMetadata(value: unknown): ParsedMetadata {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as ParsedMetadata;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
