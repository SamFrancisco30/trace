"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { parseJournalEntry, type ParsedEntry } from "@/lib/openai";
import { applyTradeToPosition } from "@/lib/portfolio";

export type EntryFormState = {
  message: string;
  status: "idle" | "error" | "success";
};

export async function createJournalEntry(
  _previousState: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const rawText = String(formData.get("rawText") ?? "").trim();

  if (!rawText) {
    return {
      message: "Write an entry first.",
      status: "error",
    };
  }

  const parsed = await parseEntrySafely(rawText);

  await prisma.$transaction(async (tx) => {
    await tx.event.create({
      data: {
        rawText,
        parsedData: parsed,
      },
    });

    const ticker = parsed.tickers[0]?.toUpperCase();

    if (
      !ticker ||
      (parsed.action !== "BUY" && parsed.action !== "SELL") ||
      parsed.quantity == null
    ) {
      return;
    }

    const current = await tx.portfolioPosition.findUnique({
      where: { ticker },
    });

    const next = applyTradeToPosition(
      current
        ? {
            shares: current.shares.toNumber(),
            avgCost: current.avgCost?.toNumber() ?? null,
          }
        : null,
      {
        action: parsed.action,
        quantity: parsed.quantity,
        price: parsed.price,
      },
    );

    await tx.portfolioPosition.upsert({
      where: { ticker },
      create: {
        ticker,
        shares: next.shares,
        avgCost: next.avgCost,
      },
      update: {
        shares: next.shares,
        avgCost: next.avgCost,
      },
    });
  });

  revalidatePath("/");

  return {
    message: "Entry saved.",
    status: "success",
  };
}

async function parseEntrySafely(rawText: string): Promise<ParsedEntry> {
  try {
    return await parseJournalEntry(rawText);
  } catch {
    return {
      tickers: [],
      action: "UNKNOWN",
      quantity: null,
      price: null,
      sentiment: "UNKNOWN",
      tags: ["parse_error"],
    };
  }
}
