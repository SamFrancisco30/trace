"use server";

import { prisma } from "@/lib/db";
import {
  findRelatedEntries,
  type DraftContext,
  type RelatedEntrySuggestion,
} from "@/lib/related-entries";

export async function getRelatedEntriesForDraft(
  draft: DraftContext,
): Promise<RelatedEntrySuggestion[]> {
  if (draft.rawText.trim().length < 12) {
    return [];
  }

  const events = await prisma.event.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });

  return findRelatedEntries(draft, events);
}
