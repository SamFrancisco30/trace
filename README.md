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

```bash
npm install
copy .env.example .env
docker compose up -d
npm run db:migrate
npm run dev
```

Open http://localhost:3000.

## Environment

`.env.example` includes:

```bash
DATABASE_URL="postgresql://trace:trace@localhost:5432/trace?schema=public"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
```

If `OPENAI_API_KEY` is missing, entries still save, but parsed metadata defaults to `UNKNOWN` and portfolio positions will not update.

## Database

Local Postgres runs from `docker-compose.yml`.

```bash
docker compose up -d
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
