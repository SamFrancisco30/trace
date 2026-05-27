import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";

import { prisma } from "@/lib/db";

// Mock Next.js runtime dependencies
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Auto-mock @/lib/openai so parseJournalEntry becomes controllable
vi.mock("@/lib/openai");

import { parseJournalEntry } from "@/lib/openai";
import {
  createJournalEntry,
  createTradeEntry,
  updateJournalEntry,
  deleteJournalEntry,
} from "./journal-actions";

const mockedParse = vi.mocked(parseJournalEntry);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ParsedEntryInput {
  tickers?: string[];
  action?: "BUY" | "SELL" | "WATCH" | "NOTE" | "HOLDINGS" | "UNKNOWN";
  quantity?: number | null;
  price?: number | null;
  sentiment?: "BULLISH" | "BEARISH" | "NEUTRAL" | "MIXED" | "UNKNOWN";
  tags?: string[];
  positions?: { ticker: string; shares: number; avgCost: number | null }[];
}

function makeParsedEntry(overrides: ParsedEntryInput = {}) {
  return {
    tickers: [],
    action: "UNKNOWN" as const,
    quantity: null,
    price: null,
    sentiment: "UNKNOWN" as const,
    tags: [],
    positions: [],
    ...overrides,
  };
}

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

const IDLE_STATE = { message: "", status: "idle" as const, inferred: null };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("journal-actions", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.portfolioPosition.deleteMany();
    await prisma.event.deleteMany();
    mockedParse.mockReset();
  });

  // =========================================================================
  // updateJournalEntry
  // =========================================================================

  describe("updateJournalEntry", () => {
    it("updates parsedData and recalculates portfolio after editing ticker and quantity", async () => {
      // --- Arrange: create a BUY entry (NVDA 20 @ 187)
      const createResult = await createTradeEntry(
        IDLE_STATE,
        makeFormData({
          tradeAction: "BUY",
          ticker: "NVDA",
          quantity: "20",
          price: "187",
          rawText: "BUY 20 NVDA @ 187",
        }),
      );
      expect(createResult.status).toBe("success");

      // Confirm initial portfolio
      let positions = await prisma.portfolioPosition.findMany();
      expect(positions).toHaveLength(1);
      expect(positions[0].ticker).toBe("NVDA");
      expect(Number(positions[0].shares)).toBe(20);
      expect(Number(positions[0].avgCost)).toBe(187);

      const event = await prisma.event.findFirstOrThrow({
        where: { deletedAt: null },
      });

      // --- Act: edit to BUY 30 AMD @ 90
      mockedParse.mockResolvedValueOnce(
        makeParsedEntry({
          action: "BUY",
          tickers: ["AMD"],
          quantity: 30,
          price: 90,
        }),
      );

      const updateResult = await updateJournalEntry(
        IDLE_STATE,
        makeFormData({
          eventId: event.id,
          rawText: "BUY 30 AMD @ 90",
        }),
      );
      expect(updateResult.status).toBe("success");

      // --- Assert: rawText updated in DB
      const updatedEvent = await prisma.event.findUniqueOrThrow({
        where: { id: event.id },
      });
      expect(updatedEvent.rawText).toBe("BUY 30 AMD @ 90");

      // --- Assert: parsedData updated correctly
      const parsedData = updatedEvent.parsedData as Record<string, unknown>;
      expect(parsedData.action).toBe("BUY");
      expect(parsedData.tickers).toEqual(["AMD"]);
      expect(parsedData.quantity).toBe(30);
      expect(parsedData.price).toBe(90);

      // --- Assert: portfolio recalculated — NVDA gone, AMD present
      positions = await prisma.portfolioPosition.findMany();
      expect(positions).toHaveLength(1);
      expect(positions[0].ticker).toBe("AMD");
      expect(Number(positions[0].shares)).toBe(30);
      expect(Number(positions[0].avgCost)).toBe(90);
    });

    it("preserves the edited rawText in the database entry", async () => {
      // --- Arrange
      await createTradeEntry(
        IDLE_STATE,
        makeFormData({
          tradeAction: "BUY",
          ticker: "NVDA",
          quantity: "10",
          price: "100",
          rawText: "BUY 10 NVDA @ 100",
        }),
      );

      const event = await prisma.event.findFirstOrThrow({
        where: { deletedAt: null },
      });
      expect(event.rawText).toBe("BUY 10 NVDA @ 100");

      // --- Act: edit with a completely different rawText
      mockedParse.mockResolvedValueOnce(
        makeParsedEntry({
          action: "BUY",
          tickers: ["NVDA"],
          quantity: 50,
          price: 105,
        }),
      );

      await updateJournalEntry(
        IDLE_STATE,
        makeFormData({
          eventId: event.id,
          rawText: "BUY 50 NVDA @ 105",
        }),
      );

      // --- Assert: the new rawText is stored, old one is replaced
      const updatedEvent = await prisma.event.findUniqueOrThrow({
        where: { id: event.id },
      });
      expect(updatedEvent.rawText).toBe("BUY 50 NVDA @ 105");
      expect(updatedEvent.rawText).not.toBe("BUY 10 NVDA @ 100");
    });
  });

  // =========================================================================
  // deleteJournalEntry
  // =========================================================================

  describe("deleteJournalEntry", () => {
    it("soft-deletes an entry so deletedAt is set", async () => {
      // --- Arrange
      mockedParse.mockResolvedValueOnce(
        makeParsedEntry({
          action: "NOTE",
          sentiment: "NEUTRAL",
          tags: ["idea"],
        }),
      );

      await createJournalEntry(
        IDLE_STATE,
        makeFormData({ rawText: "Interesting setup on TSLA" }),
      );

      const event = await prisma.event.findFirstOrThrow({
        where: { deletedAt: null },
      });

      // --- Act
      await deleteJournalEntry(makeFormData({ eventId: event.id }));

      // --- Assert: deletedAt is no longer null
      const deleted = await prisma.event.findUniqueOrThrow({
        where: { id: event.id },
      });
      expect(deleted.deletedAt).not.toBeNull();
    });

    it("excludes soft-deleted entries from queries filtered by deletedAt IS NULL", async () => {
      // --- Arrange
      mockedParse.mockResolvedValueOnce(
        makeParsedEntry({ action: "NOTE" }),
      );

      await createJournalEntry(
        IDLE_STATE,
        makeFormData({ rawText: "Some note" }),
      );

      const event = await prisma.event.findFirstOrThrow({
        where: { deletedAt: null },
      });

      // --- Act
      await deleteJournalEntry(makeFormData({ eventId: event.id }));

      // --- Assert: querying with deletedAt: null no longer returns the entry
      const activeEvents = await prisma.event.findMany({
        where: { deletedAt: null },
      });
      expect(activeEvents).toHaveLength(0);
    });

    it("recalculates portfolio correctly after deleting a BUY entry", async () => {
      // --- Arrange: no positions initially

      await createTradeEntry(
        IDLE_STATE,
        makeFormData({
          tradeAction: "BUY",
          ticker: "NVDA",
          quantity: "20",
          price: "187",
          rawText: "BUY 20 NVDA @ 187",
        }),
      );

      // Confirm NVDA is in portfolio
      let positions = await prisma.portfolioPosition.findMany();
      expect(positions).toHaveLength(1);
      expect(positions[0].ticker).toBe("NVDA");
      expect(Number(positions[0].shares)).toBe(20);

      const event = await prisma.event.findFirstOrThrow({
        where: { deletedAt: null },
      });

      // --- Act: delete the only BUY entry
      await deleteJournalEntry(makeFormData({ eventId: event.id }));

      // --- Assert: portfolio returns to empty (initial state)
      positions = await prisma.portfolioPosition.findMany();
      expect(positions).toHaveLength(0);
    });
  });
});