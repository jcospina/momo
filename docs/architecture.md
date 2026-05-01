# Architecture

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **Supabase** — Postgres, RLS, Google OAuth, Realtime
- **Visx** — stats visualizations
- **CSS Modules** — component-scoped styling
- **Biome** — linting and formatting
- **Jest** — unit/integration tests

## Data Flow

```txt
UI Layers (app/components/features/hooks/providers)
  -> Data Facades (src/lib/data/<domain>/{server,client}.ts)
  -> Transport Internals (actions/helpers/api routes/realtime helpers)
  -> Supabase (Postgres + RLS + Realtime)
```

For migrated UI scopes, data access goes through `src/lib/data/*` facades instead of direct transport imports.

## Data Boundary

`src/lib/data/` is the explicit boundary between presentation and transport.

- UI layers should import only facade entrypoints (`server.ts` or `client.ts` as appropriate).
- Client code must not import `src/lib/data/**/server.ts`.
- Server code must not import `src/lib/data/**/client.ts`.
- `src/ui/` stays presentational and transport-agnostic.
- Migrated UI scopes must not import `@actions/*`, `@helpers/*`, `@lib-supabase/*`, `@supabase/*`, or raw `/api/*` fetches.

Enforced by `scripts/check-data-boundaries.mjs` (runs in `pnpm lint`).

## Module Inventory

### `src/app/`

App Router pages + route handlers. API routes currently include `chat-history`, `chat-sync`, `realtime-token`, and `client-log`.

### `src/lib/data/`

Domain facades for environment-safe data access:

- `auth`
- `prefs`
- `profile`
- `households`
- `invites`
- `expenses`
- `stats`
- `messages`

### `src/lib/actions/`

Internal server-action transport layer (`'use server'`) used behind facades.

### `src/lib/helpers/`

Domain helpers for parsing, persistence, stats shaping/query helpers, and shared server utilities.

### `src/lib/proxy/` + `src/proxy.ts`

Route protection and redirects (unauthenticated redirects, root redirect, onboarding/home guards).

### `src/features/`

Feature-level logic, currently chat hooks/realtime/sync behavior.

### `src/providers/`

App-level React providers (profile, navigation progress, shared realtime client).

### `src/components/`

Feature components (chat, stats, charts, profile, household, etc.).

### `src/ui/`

Reusable UI primitives, intentionally data-source agnostic.

## Path Aliases

| Alias | Path |
| ------- | ------- |
| `@actions/*` | `src/lib/actions/*` |
| `@auth/*` | `src/lib/auth/*` |
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
| `@/*` | `src/*` |

## Conventions

- Facade/action results keep backward-compatible payloads with optional `errorCode`.
- Chat message statuses follow: `pending -> processed | needs_category | failed | no_expense`.
- Realtime is shared through `RealtimeClientProvider` and paired with `/api/chat-sync` fallback.
- Route protection behavior is defined in `src/proxy.ts` and `src/lib/proxy/rules/*`.
