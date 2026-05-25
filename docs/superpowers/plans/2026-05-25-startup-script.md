# Startup Script Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PowerShell helper that starts the local database and Next.js dev server with one command.

**Architecture:** Keep the script thin and repo-local. It should prepare the environment, start Postgres with Docker Compose, apply Prisma client generation and migrations, then hand off to `npm run dev` in the foreground so the shell stays attached to the app server.

**Tech Stack:** PowerShell, Docker Compose, Prisma, Next.js

---

### Task 1: Add the startup script

**Files:**
- Create: `scripts/start-dev.ps1`

- [ ] **Step 1: Write the script**
- [ ] **Step 2: Run it and verify it starts Docker and Next.js**
- [ ] **Step 3: Check the app responds on `http://localhost:3000`**

### Task 2: Update the README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite the setup section to separate first-time setup from daily startup**
- [ ] **Step 2: Document the new PowerShell helper**
- [ ] **Step 3: Keep the existing manual commands for explicit control**
