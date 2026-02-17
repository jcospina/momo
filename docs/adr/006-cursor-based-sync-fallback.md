# ADR-006: Cursor-Based Sync Fallback

**Status:** Accepted
**Date:** 2026-02-17

## Context

Supabase Realtime connections can drop (network changes, server restarts, mobile backgrounding). When the connection resumes, the client may have missed messages. The system needs a way to catch up without refetching the entire message history.

Options considered:

1. **Full refetch** — Simple but wasteful. Re-downloads all messages on every reconnect.
2. **Polling** — Periodic fetches at an interval. Adds constant server load regardless of activity.
3. **Cursor-based sync** — Client tracks its last known message and requests only newer ones.

## Decision

A cursor-based sync endpoint (`/api/chat-sync`) lets the client send the ID of its last known message and receive only messages created after that point. The sync is triggered on realtime reconnection or when the client suspects missed messages.

## Consequences

**Benefits:**

- Bandwidth-efficient — only transfers the delta, not the full history.
- Resumable — if sync itself fails, the cursor hasn't moved, so retrying is safe.
- Works for both scopes (personal and household) using the same mechanism.
- No polling overhead — sync is event-driven (triggered by reconnection).

**Trade-offs:**

- Adds complexity — the client must track a cursor per scope and trigger sync at the right times.
- If the cursor message has been deleted, the sync needs a fallback strategy (currently falls back to a time-based query).
- The sync endpoint is an additional API route to maintain alongside the realtime subscription.
