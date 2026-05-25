# AI Trading Journal MVP Design

## Goal

Build a minimal AI-assisted trading journal that lets a user enter one natural-language note, save the raw text, extract structured metadata, and maintain simple portfolio positions from parsed trade events.

## Assumptions

- This is a fresh Next.js project scaffold.
- Local development uses Docker Compose PostgreSQL.
- Production can later use any Postgres-compatible provider.
- No auth, broker integration, market data, recommendations, queues, Redis, or agent framework.
- OpenAI is used only for parsing and structuring the user entry.

## Architecture

The app is a single Next.js App Router page backed by Prisma. A server action accepts raw text, calls OpenAI structured output parsing, stores the original text and parsed JSON, and updates portfolio positions in one database transaction when the parsed entry is a buy or sell.

## Data

- `events`: immutable timeline entries with `id`, `created_at`, `raw_text`, and `parsed_data`.
- `portfolio_positions`: current position by ticker with `ticker`, `shares`, `avg_cost`, and `updated_at`.

## UI

The page has an editor-like natural language input, a compact portfolio state section, and a chronological timeline. Styling is monochrome, quiet, and typography-focused.

## Verification

- Unit tests cover portfolio position math.
- Prisma migration exists for the schema.
- `npm run lint`, tests, Prisma generation, and production build should pass.
