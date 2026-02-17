# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MoMo is a personal finance/expense tracker with a chat-like interface. Users log expenses by typing messages (or uploading receipts). Supports personal and household scopes with real-time collaboration. Built with Next.js 16 App Router, React 19, Supabase (Postgres + Auth + Realtime), and ECharts.

## Commands

```bash
pnpm dev              # Dev server at localhost:3000
pnpm build            # Production build
pnpm lint             # ESLint
pnpm format           # Prettier (write)
pnpm format:check     # Prettier (check only)
pnpm test             # Jest tests
pnpm test -- --watch  # Jest watch mode
```

Pre-commit hooks (Husky + lint-staged) auto-run ESLint and Prettier on staged files.

## Path Aliases (tsconfig.json)

```
@actions/*     → src/lib/actions/*
@components/*  → src/components/*
@constants/*   → src/lib/constants/*
@helpers/*     → src/lib/helpers/*
@hooks/*       → src/hooks/*
@lib-types/*   → src/lib/types/*
@features/*    → src/features/*
@providers/*   → src/providers/*
@proxy/*       → src/lib/proxy/*
@lib-supabase/* → src/lib/supabase/*
@ui/*          → src/ui/*
@utils/*       → src/lib/utils/*
```

## Architecture

### Data Flow

```
UI Components → Feature Hooks → Server Actions/API Routes → Supabase (Postgres + RLS)
                              → Realtime Hooks → Supabase Realtime
```

### Key Layers

- **`src/app/`** — Next.js App Router pages and API routes. Protected area under `home/`.
- **`src/lib/actions/`** — Server actions (`'use server'`). All mutations go here. Return typed results: `{ ok: true, data }` or `{ ok: false, errorCode }`.
- **`src/lib/helpers/`** — Pure utility functions (parsing, categorization, validation).
- **`src/lib/types/`** — Shared TypeScript types per domain.
- **`src/components/`** — Feature-specific components (chat, charts, stats, navbar).
- **`src/ui/`** — Reusable, unstyled/headless UI primitives (button, dialog, input, select). No data fetching here.
- **`src/features/`** — Complex feature modules with dedicated hooks (currently: chat).
- **`src/providers/`** — React context providers (profile, realtime client, navigation progress).
- **`src/hooks/`** — Generic reusable hooks.

### Chat Processing Pipeline

Message send (server action) → insert to DB (status: `pending`) → `processChatMessage()` parses text into expense entries (amount + category via n-gram scoring) → creates expenses → updates message status (`processed`, `needs_category`, `failed`, `no_expense`) → realtime broadcasts to subscribers.

Processing is **synchronous** within the server action (no background jobs — serverless constraint).

### Expense Parsing

Located in `@helpers/expenses/`. Text normalization → amount extraction (supports k/m multipliers) → category scoring via n-gram matching against dictionary in `@constants/expenses/dictionary` → tag extraction from matched terms.

### Currency Handling

COP stores whole units (no cents). EUR/USD store minor units (multiply by 100 on input, divide by 100 on display).

### Realtime

Single shared Supabase realtime client (via `RealtimeClientProvider`). Supports dual-scope subscriptions (personal + household simultaneously). Sync fallback via `/api/chat-sync` for unreliable connections. Message deduplication handles realtime vs server-action races.

### Household Constraints

- One household per user (DB-enforced via unique index + trigger).
- Max 5 members per household (DB-enforced via trigger).
- Invite flow: share link with inviter's token → `/invite/[token]` → validates via `get_share_link_info()` RPC.

### Stats

Server fetches from DB views (`monthly_by_category_user`, `daily_totals_by_month`, etc.) → shapes into chart-ready data → client filters by time window (1m/3m/6m/12m). Charts use ECharts (ring, bar, line).

## Database

Schema design rationale is documented in `docs/database.md`. SQL DDL lives in the `schema/` directory. All tables have RLS enabled. Key tables: `households`, `household_members`, `user_profiles`, `user_prefs`, `chat_messages`, `expenses`. Views handle stats aggregation.

Supabase clients: `@lib-supabase/server.ts` (server-side with session/RLS) and `@lib-supabase/service-role.ts` (admin, bypasses RLS).

## Planned Architecture Change

A data-layer decoupling is planned (see `docs/plans/decouple-data-layer.md`): introduce adapter-based data interfaces so the UI layer has zero Supabase imports. Phases go from auth (easy) through chat+realtime (hard).
