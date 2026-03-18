# ADR-006: Cursor-Based Sync Fallback

**Status:** Accepted
**Date:** 2026-02-17

## Context

Supabase Realtime connections can drop (network changes, app backgrounding, transient channel errors). When the client resumes, messages may be missing locally. We need a catch-up mechanism that avoids full-history refetches.

Options considered:

1. **Full refetch** — simple but wasteful.
2. **Polling** — constant load even when idle.
3. **Cursor-based sync** — request only rows after last known message.

## Decision

Use `POST /api/chat-sync` as fallback sync endpoint.

- Household scope uses cursor-based paging (`created_at`, `id`) for incremental catch-up.
- Personal scope can also call the same endpoint and pull the latest batch when needed.
- Sync is triggered by reconnect/visibility/pending recovery paths, not constant polling.

## Consequences

**Benefits:**

- Delta-based transfer keeps reconnect recovery efficient.
- Safe retries because cursor progression is controlled client-side.
- Works with existing realtime subscriptions without introducing queue infrastructure.

**Trade-offs:**

- Client hooks must track sync state (cursor, cooldown, in-flight/pending state).
- Additional route handler maintenance (`/api/chat-sync`).
- Sync caps (page size / max pages) can still leave backlog when reconnect gaps are very large.
