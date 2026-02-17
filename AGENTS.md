# AGENTS.md

## Project Essence

MoMo is a chat-first expense tracker for personal and household finance tracking.
Users log expenses by typing messages (and optionally from receipts), then review
stats/charts by scope (`personal` or `household`).

Core stack:

- Next.js 16 App Router + React 19 + TypeScript
- Supabase (Postgres, Auth, Realtime, RLS)
- ECharts for data visualizations
- Jest + Testing Library for tests

## Quick Commands

- `pnpm dev` - local dev server
- `pnpm build` - production build
- `pnpm lint` - ESLint
- `pnpm format` / `pnpm format:check` - Prettier
- `pnpm test` - Jest

## Architecture Map

- `src/app/` - routes, layouts, route handlers, page-level composition
- `src/lib/actions/` - server actions (`'use server'`) for mutations/queries used by UI
- `src/lib/helpers/` - domain logic and Supabase query helpers
- `src/lib/types/` - shared domain/result types
- `src/features/` - feature modules (notably chat hooks + API wrappers)
- `src/components/` - feature UI components
- `src/ui/` - reusable UI primitives; keep data-source agnostic
- `src/providers/` - cross-cutting client providers (profile, realtime, nav progress)
- `schema/` - SQL schema/types/views
- `.docs/momo_summary.md` - technical DB/architecture summary
- `.docs/decouple_plan.md` - planned data-layer adapter migration

## Non-Negotiable Boundaries
- Keep `src/ui/` presentational and reusable. No Supabase imports, no domain IO.
- Prefer data access in `src/lib/actions/` + `src/lib/helpers/`.
- Prefer server components for data loading in `src/app/**`; add `'use client'` only when needed.
- Keep route protection behavior aligned with `src/proxy.ts` and `src/lib/proxy/rules/*`.
- Do not break personal/household dual-scope behavior in chat or stats.

## Existing Conventions To Follow

- TypeScript strict mode; explicit types on public exports.
- Path aliases from `tsconfig.json` (`@actions/*`, `@helpers/*`, `@ui/*`, etc.).
- Styling via CSS modules + global tokens in `src/app/globals.css`.
- Use `cn()` (`@utils/cn`) for class composition.
- Server action result style is currently `payload + optional errorCode` (not exception-first).
- Error codes live in typed constants (`src/lib/types/errors.ts`, `src/lib/constants/errors.ts`).
- Keep imports grouped: external -> aliases -> relative.

## Domain Rules You Must Preserve

- Chat pipeline: insert `pending` message -> parse/process -> persist expenses ->
  update status (`processed`, `needs_category`, `failed`, `no_expense`).
- Realtime + sync must coexist:
  - realtime updates for low latency
  - `/api/chat-sync` fallback for missed events/resubscribe/visibility recovery
  - dedupe/ordering by `created_at` then `id`
- Currency:
  - `COP` stored as whole units
  - `USD`/`EUR` stored as minor units (x100)
- Household constraints (DB enforced):
  - max one household per user
  - max 5 members per household

## Data Layer Direction (Important)

The repo is mid-transition toward adapter-based data interfaces
(`.docs/decouple_plan.md`).

When adding new code:

- Avoid introducing fresh Supabase coupling in UI-centric layers.
- Prefer interface-friendly shapes and typed result objects.
- Keep transport details isolated to lib/data-access boundaries.

## Testing Guidance For Agents

- Add/update tests near changed logic (see existing `*.test.ts[x]` patterns).
- Prioritize tests for:
  - expense parsing/normalization/category scoring
  - chat optimistic/reconcile/dedupe behavior
  - stats shaping and month-window logic
- Run targeted tests first, then `pnpm test` if change scope is broad.

## Safe Change Checklist

Before finishing, verify:

1. Lint/format pass (`pnpm lint`, `pnpm format:check`).
2. Changed flows still respect auth + proxy redirects.
3. Result shapes and `errorCode` unions remain type-safe.
4. Chat/status/currency invariants are preserved.
5. If schema behavior changes, update `schema/*.sql` and docs in `.docs/`.
