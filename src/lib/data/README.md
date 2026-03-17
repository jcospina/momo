# Data Facades (`src/lib/data`)

This folder defines the explicit data boundary for vertical-slice decoupling.

## Folder Convention

Each domain must expose exactly three files:

- `server.ts`: server-only facade entrypoint (server components, route handlers, server actions).
- `client.ts`: client-only facade entrypoint (client components/hooks/providers).
- `types.ts`: shared domain result/input/output types.

Current domains:

- `auth`
- `prefs`
- `profile`
- `households`
- `invites`
- `expenses`
- `stats`
- `messages`

## Guardrails

- Do not import `server.ts` from client modules.
- Do not import `client.ts` from server modules.
- Keep UI layers free from transport details (`@supabase/*`, `@lib-supabase/*`, direct `@actions/*`, raw `/api/*` fetches in migrated scopes).
- Keep facades free from UI imports and CSS imports.

Enforcement is implemented by `scripts/check-data-boundaries.mjs` and runs in `pnpm lint`.
