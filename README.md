# Trace

Trace is a minimal AI-assisted trading journal. It is not a trading platform and does not provide investment advice. OpenAI is used only to parse a journal entry into structured metadata.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- Prisma
- PostgreSQL via Docker Compose
- OpenAI structured outputs

## Setup

Use Node.js 20.19 or newer.

### First-time setup

```bash
npm install
copy .env.example .env
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

Open http://localhost:3000.

### Daily startup

For day-to-day development, use the PowerShell helper:

```powershell
.\scripts\start-dev.ps1
```

It starts PostgreSQL, generates the Prisma client, applies migrations, and then launches the Next.js dev server in the background.
Stdout and stderr are written to `.trace-dev.out.log` and `.trace-dev.err.log` in the repo root.

### Stopping local dev

Use the matching stop script when you want to shut everything down:

```powershell
.\scripts\stop-dev.ps1
```

It stops the background dev server process and brings down the local PostgreSQL container without deleting the data volume.

### Timeline editing

Entries in the timeline can now be edited in place or moved to trash from the entry controls.
The portfolio state is recomputed from the remaining active entries, so changing or deleting an entry keeps the current holdings view consistent.

## Environment

`.env.example` includes:

```bash
DATABASE_URL="postgresql://trace:trace@localhost:5432/trace?schema=public"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
```

If `OPENAI_API_KEY` is missing, entries still save, but parsed metadata defaults to `UNKNOWN` and portfolio updates will not be derived from AI parsing.

## Database

Local Postgres runs from `docker-compose.yml`.

```bash
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:studio
```

Production can later point `DATABASE_URL` at Supabase, Neon, or another Postgres-compatible database.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm test
npm run db:generate
npm run db:migrate
```

## Key Files

- `app/page.tsx`: single timeline page.
- `components/entry-form.tsx`: natural language input form.
- `lib/journal-actions.ts`: server action for parsing, saving, and portfolio updates.
- `lib/openai.ts`: OpenAI structured output parsing.
- `lib/portfolio.ts`: position math.
- `prisma/schema.prisma`: database schema.
- `docker-compose.yml`: local PostgreSQL service.
