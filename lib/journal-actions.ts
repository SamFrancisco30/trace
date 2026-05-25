"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { parseJournalEntry, type ParsedEntry } from "@/lib/openai";
import { rebuildPortfolioPositions } from "@/lib/portfolio-state";

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

    await syncPortfolioFromActiveEvents(tx);
  });

  revalidatePath("/");

  return {
    message: "Entry saved.",
    status: "success",
  };
}

export async function updateJournalEntry(
  _previousState: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const eventId = String(formData.get("eventId") ?? "").trim();
  const rawText = String(formData.get("rawText") ?? "").trim();

  if (!eventId) {
    return {
      message: "Missing entry id.",
      status: "error",
    };
  }

  if (!rawText) {
    return {
      message: "Write an entry first.",
      status: "error",
    };
  }

  const parsed = await parseEntrySafely(rawText);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: {
          rawText,
          parsedData: parsed,
        },
      });

      await syncPortfolioFromActiveEvents(tx);
    });
  } catch {
    return {
      message: "Could not update entry.",
      status: "error",
    };
  }

  revalidatePath("/");

  return {
    message: "Entry updated.",
    status: "success",
  };
}

export async function deleteJournalEntry(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "").trim();

  if (!eventId) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: eventId },
      data: {
        deletedAt: new Date(),
      },
    });

    await syncPortfolioFromActiveEvents(tx);
  });

  revalidatePath("/");
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
      positions: [],
    };
  }
}

async function syncPortfolioFromActiveEvents(tx: Prisma.TransactionClient) {
  const events = await tx.event.findMany({
    where: { deletedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const positions = rebuildPortfolioPositions(events);

  await tx.portfolioPosition.deleteMany();

  if (positions.length > 0) {
    await tx.portfolioPosition.createMany({
      data: positions.map((position) => ({
        ticker: position.ticker,
        shares: position.shares,
        avgCost: position.avgCost,
      })),
    });
  }
}
