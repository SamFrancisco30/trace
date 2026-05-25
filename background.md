# Project Background

Trace is an AI-assisted trading journal focused on recording trading decisions, market thoughts, and personal observations in a lightweight, natural way.

The app is NOT intended to be:

* a broker platform
* a trading terminal
* an AI investment advisor
* an automated trading system

Instead, the goal is to build a minimal, personal “decision timeline” for traders.

The core philosophy is:

> Many valuable market judgments are never actually traded.

For example:

* a trader thinks TSLA will continue pulling back
* a trader feels AI stocks are overheating
* a trader wants to buy something but has no available capital
* a trader notices emotional behavior like FOMO

Most existing trading journals focus heavily on:

* executed trades
* PnL analytics
* dashboards
* statistics

This project focuses more on:

* thought process
* market calls
* reasoning
* emotional context
* chronological decision history

The app should feel more like:

* a calm personal notebook
* a decision journal
* a thinking space

rather than:

* a flashy fintech dashboard
* a Bloomberg-style terminal
* a crypto trading UI

# Product Direction

The user opens the app and quickly records thoughts in natural language.

Examples:

* "Bought 20 shares of NVDA at 187 because AI demand still looks strong"
* "TSLA probably still has more downside"
* "Feeling a bit FOMO today"
* "Trimmed half my AMD position"
* "AI stocks are starting to feel overheated"

The system uses AI only for:

* parsing
* metadata extraction
* structuring information

AI is NOT used for:

* giving investment advice
* predicting markets
* autonomous agents
* generating fake insights
* acting as a trading coach

# Core MVP Philosophy

The most important thing is reducing friction.

The app should make it extremely easy to:

* open the app
* type one sentence
* save it to the timeline

Fast recording is more important than advanced analytics.

# Current MVP Scope

## Timeline

A chronological feed of all entries.

Each entry stores:

* raw text
* timestamp
* extracted metadata

## AI Parsing

Natural language input is parsed into structured metadata.

Possible extracted fields:

* tickers
* trade action
* quantity
* price
* sentiment
* tags

The original raw text must always be preserved.

## Portfolio State

Maintain a lightweight current portfolio state:

* ticker
* shares
* average cost

This is only for context and timeline continuity.

# Technical Philosophy

The project should prioritize:

* simplicity
* maintainability
* fast iteration
* local-first architecture
* minimal infrastructure

Avoid:

* over-engineering
* microservices
* agent frameworks
* complex analytics systems
* unnecessary abstractions

# Planned Tech Stack

Frontend:

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui

Backend:

* Next.js API routes / server actions

Database:

* PostgreSQL
* Prisma ORM

Local development:

* Docker Compose

AI:

* OpenAI structured JSON extraction

# UI Direction

The UI should be:

* monochrome
* minimal
* typography-focused
* calm
* editor-like

Design inspiration:

* Mubu
* Notion
* Obsidian
* Linear

Avoid:

* gradients
* glassmorphism
* flashy fintech aesthetics
* excessive dashboards
* noisy charts

# Important Architectural Notes

The system should be event/timeline oriented.

Entries are the core object.

The original user text is the source of truth.

Structured metadata should be treated as AI-generated interpretation, not canonical truth.

The architecture should remain flexible for future features like:

* replay
* semantic search
* local-first sync
* self-hosted deployments
* cloud-hosted version
* richer AI-assisted querying

But those features are NOT part of the current MVP.
