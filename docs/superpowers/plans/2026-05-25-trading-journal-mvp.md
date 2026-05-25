# Trading Journal MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved minimal AI-assisted trading journal MVP.

**Architecture:** Next.js App Router renders the timeline and submits entries through a server action. Prisma persists raw events and portfolio positions in PostgreSQL. OpenAI structured outputs parse metadata only.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, shadcn/ui-compatible components, Prisma, PostgreSQL, Docker Compose, OpenAI Node SDK, Vitest.

---

### Task 1: Scaffold

**Files:**
- Create: Next.js application files
- Modify: `.gitignore`

- [ ] Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --use-npm --yes`.
- [ ] Install Prisma, OpenAI SDK, Zod, Vitest.
- [ ] Verify `npm run lint` starts from a clean scaffold.

### Task 2: Data And Infrastructure

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `prisma/schema.prisma`
- Create: `prisma/migrations/.../migration.sql`
- Modify: `package.json`

- [ ] Define `Event` and `PortfolioPosition`.
- [ ] Add Docker Compose Postgres service only.
- [ ] Add setup scripts for Prisma generate/migrate.
- [ ] Verify `npx prisma generate`.

### Task 3: Business Logic

**Files:**
- Create: `lib/portfolio.ts`
- Create: `lib/portfolio.test.ts`
- Create: `lib/openai.ts`
- Create: `lib/journal-actions.ts`

- [ ] Write failing tests for buy, sell, and missing price behavior.
- [ ] Implement minimal position math.
- [ ] Add OpenAI structured output parser.
- [ ] Add server action to persist event and update portfolio transactionally.

### Task 4: UI

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Create: `components/entry-form.tsx`
- Create: `components/timeline.tsx`
- Create: `components/portfolio-summary.tsx`
- Create: `components/ui/button.tsx`
- Create: `components/ui/textarea.tsx`

- [ ] Render current positions and events from Prisma.
- [ ] Submit raw text with a server action.
- [ ] Display raw text, created time, and compact metadata.
- [ ] Keep visuals monochrome and editor-like.

### Task 5: Docs And Verification

**Files:**
- Create: `README.md`

- [ ] Document Docker, env, migrate, dev, test, and build commands.
- [ ] Run `npm test`, `npm run lint`, `npm run build`.
- [ ] Start local dev server and report URL.
