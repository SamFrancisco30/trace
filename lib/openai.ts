import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const parsedEntrySchema = z.object({
  tickers: z.array(z.string()),
  action: z.enum(["BUY", "SELL", "WATCH", "NOTE", "UNKNOWN"]),
  quantity: z.number().nullable(),
  price: z.number().nullable(),
  sentiment: z.enum(["BULLISH", "BEARISH", "NEUTRAL", "MIXED", "UNKNOWN"]),
  tags: z.array(z.string()),
});

export type ParsedEntry = z.infer<typeof parsedEntrySchema>;

const fallbackParsedEntry: ParsedEntry = {
  tickers: [],
  action: "UNKNOWN",
  quantity: null,
  price: null,
  sentiment: "UNKNOWN",
  tags: [],
};

export async function parseJournalEntry(rawText: string): Promise<ParsedEntry> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === "sk-your-api-key") {
    return fallbackParsedEntry;
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    instructions:
      "Extract trading journal metadata from the user text. Do not provide investment advice, recommendations, predictions, summaries, or commentary. Return only metadata that is directly implied by the text.",
    input: rawText,
    text: {
      format: zodTextFormat(parsedEntrySchema, "journal_entry_metadata"),
    },
  });

  return response.output_parsed ?? fallbackParsedEntry;
}
