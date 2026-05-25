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
  sentiment?: string;
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
        <ol className="space-y-6">
          {entries.map((entry) => {
            const metadata = toMetadata(entry.parsedData);

            return (
              <li key={entry.id} className="border-b border-zinc-100 pb-6">
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
  const items = [
    metadata.action && metadata.action !== "UNKNOWN"
      ? metadata.action
      : null,
    metadata.tickers?.length ? metadata.tickers.join(", ") : null,
    metadata.quantity != null ? `${metadata.quantity} shares` : null,
    metadata.price != null ? `@ ${metadata.price}` : null,
    metadata.sentiment && metadata.sentiment !== "UNKNOWN"
      ? metadata.sentiment.toLowerCase()
      : null,
    ...(metadata.tags ?? []),
  ].filter(Boolean);

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
