# Entry Edit/Delete Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users edit or soft-delete timeline entries, while keeping portfolio state consistent by recomputing it from the remaining timeline.

**Architecture:** Treat timeline entries as the source of truth. Store a soft-delete timestamp on each event, filter deleted rows from the main timeline, and recompute portfolio positions from the active event stream whenever an entry is created, edited, or deleted. Keep the UI simple: each timeline item gets edit and delete controls, and edits update the original raw text instead of manipulating portfolio rows directly.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, PostgreSQL, server actions, React

---

### Task 1: Extend the data model for soft deletes

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/migrations/20260525000000_init/migration.sql`

- [ ] **Step 1: Add a `deletedAt` field to `Event`**
- [ ] **Step 2: Regenerate Prisma client and create/update migration SQL**
- [ ] **Step 3: Verify the schema still builds**

### Task 2: Make portfolio recomputation deterministic

**Files:**
- Modify: `lib/portfolio.ts`
- Modify: `lib/journal-actions.ts`
- Test: `lib/portfolio.test.ts`

- [ ] **Step 1: Add tests for sell-to-zero and oversell behavior**
- [ ] **Step 2: Make sells clear closed positions or prevent silent stale state**
- [ ] **Step 3: Recompute portfolio from active entries after edits and deletions**

### Task 3: Add edit/delete server actions

**Files:**
- Modify: `lib/journal-actions.ts`
- Test: `lib/journal-actions.test.ts`

- [ ] **Step 1: Write tests for editing an entry and soft-deleting an entry**
- [ ] **Step 2: Add server actions that update raw text, reparse, and recompute portfolio**
- [ ] **Step 3: Ensure deleted entries are excluded from the main timeline**

### Task 4: Add timeline controls and editing UI

**Files:**
- Modify: `components/timeline.tsx`
- Modify: `app/page.tsx` if needed
- Create: `components/timeline-entry-editor.tsx` if the inline edit UI is easier to isolate

- [ ] **Step 1: Add edit and delete controls to each timeline item**
- [ ] **Step 2: Add a simple edit form that posts the full raw text**
- [ ] **Step 3: Keep the visual style consistent with the current monochrome UI**

### Task 5: Update parsing fallback and documentation

**Files:**
- Modify: `lib/openai.ts`
- Modify: `lib/openai.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Expand the local holdings parser coverage**
- [ ] **Step 2: Add tests for the improved fallback parser**
- [ ] **Step 3: Document edit/delete behavior and the soft-delete model**
