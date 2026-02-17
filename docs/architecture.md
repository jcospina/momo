# Architecture

## Tech Stack

- **Next.js 16** (App Router) — pages, server actions, API routes
- **React 19** — UI composition
- **Supabase** — Postgres, RLS, Google OAuth, Realtime
- **ECharts** — data visualizations (ring, bar, line charts)
- **CSS Modules** — component-scoped styles with BEM naming

## Data Flow

```txt
UI Components → Feature Hooks → Server Actions/API Routes → Supabase (Postgres + RLS)
                              → Realtime Hooks → Supabase Realtime
```

The UI is split into personal and household scopes with a scope toggle on stats and chat. Server actions handle all mutations and return typed results. Supabase Realtime powers live chat updates via a single shared client.

## Module Inventory

### `src/app/`

Next.js App Router pages and API routes. Protected area under `home/`. API routes include `chat-history` and `chat-sync` for catch-up and resilience.

### `src/lib/actions/`

Server actions (`'use server'`). All mutations go through here. Organized by domain: `auth/`, `chat/`, `stats/`, etc.

**Result pattern:** Every server action returns a discriminated union:

```ts
{ ok: true, data: T } | { ok: false, errorCode: string }
```

### `src/lib/helpers/`

Pure utility functions with no side effects. Key modules:

- `expenses/expense-parser.ts` — text-to-expense parsing pipeline
- `expenses/expense-category.ts` — n-gram category scoring
- `expenses/expense-normalize.ts` — text normalization
- `expenses/expense-persistence.ts` — expense creation helpers
- `expenses/expense-stats.ts` — stats data shaping

### `src/lib/types/`

Shared TypeScript types organized per domain.

### `src/lib/constants/`

Application constants including the expense category dictionary (`expenses/dictionary`).

### `src/components/`

Feature-specific components organized by domain: `chat/`, `charts/`, `stats/`, `navbar/`.

### `src/ui/`

Reusable, unstyled/headless UI primitives (button, dialog, input, select, checkbox, tooltip, etc.). No data fetching in this layer.

**`PropsWithClassName` pattern:** UI components accept `className` for composition. Most extend a base type that includes `className` and `style`.

### `src/features/`

Complex feature modules with dedicated hooks. Currently: `chat/` with hooks for message management, realtime subscriptions, and sync.

### `src/providers/`

React context providers:

- `profile-provider.tsx` — user profile and preferences
- `realtime-client-provider.tsx` — shared Supabase realtime client
- Navigation progress provider

### `src/hooks/`

Generic reusable hooks not tied to a specific feature.

## Path Aliases

| Alias | Path |
| ------- | -------------- |
| `@actions/*` | `src/lib/actions/*` |
| `@components/*` | `src/components/*` |
| `@constants/*` | `src/lib/constants/*` |
| `@helpers/*` | `src/lib/helpers/*` |
| `@hooks/*` | `src/hooks/*` |
| `@lib-types/*` | `src/lib/types/*` |
| `@features/*` | `src/features/*` |
| `@providers/*` | `src/providers/*` |
| `@proxy/*` | `src/lib/proxy/*` |
| `@lib-supabase/*` | `src/lib/supabase/*` |
| `@ui/*` | `src/ui/*` |
| `@utils/*` | `src/lib/utils/*` |

## Key Conventions

- **Server action results:** `{ ok: true, data }` or `{ ok: false, errorCode }` — never throw from server actions.
- **CSS Modules with BEM:** Component styles use `.momo-component__element--modifier` naming.
- **`PropsWithClassName`:** UI primitives accept `className` for external styling.
- **Supabase clients:** `@lib-supabase/server.ts` (server-side with session/RLS) and `@lib-supabase/service-role.ts` (admin, bypasses RLS).
