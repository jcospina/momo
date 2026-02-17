# Chat System

## Overview

MoMo's primary interface is a chat where users type expenses as messages. The chat supports two scopes (personal and household) with real-time updates and offline resilience.

## Dual-Scope Architecture

Users can toggle between personal and household chat scopes:

- **Personal** — Messages where `household_id IS NULL`. Only visible to the sender.
- **Household** — Messages with a `household_id`. Visible to all household members via RLS.

Both scopes share the same UI, hooks, and realtime infrastructure.

## Message Lifecycle

### Optimistic Sends

When a user sends a message:

1. The message appears immediately in the UI (optimistic update)
2. A server action inserts the message with status `pending`
3. `processChatMessage()` runs synchronously, parsing and creating expenses
4. The message status updates to its final state
5. Realtime broadcasts the update to all subscribers

### Message Status

| Status | Meaning |
| -------- | --------- |
| `pending` | Just inserted, not yet processed |
| `processed` | Successfully parsed into expenses |
| `needs_category` | Expenses created but some lack categories |
| `no_expense` | No parseable expense in the text |
| `failed` | Processing error |

### Synchronous Processing

Processing happens within the server action, not in a background job. This is a deliberate choice for serverless environments where background jobs can be lost. See [ADR-001](adr/001-synchronous-chat-processing.md).

## Realtime

### Single Shared Client

A single Supabase realtime client is shared across the app via `RealtimeClientProvider`. This avoids multiple WebSocket connections and simplifies lifecycle management. See [ADR-002](adr/002-single-shared-realtime-client.md).

### Dual Subscriptions

The client maintains up to two active subscriptions simultaneously:

- Personal channel (always active when authenticated)
- Household channel (active when the user belongs to a household)

Both channels listen for `INSERT`, `UPDATE`, and `DELETE` events on `chat_messages` filtered by scope.

### Stall Detection

The realtime hooks monitor subscription health with a stall detector:

- **Active tab:** resubscribe if no heartbeat for 30s
- **Hidden tab:** resubscribe if no heartbeat for 60s
- **Check interval:** every 5s
- **Reconnect backoff:** base 100ms, factor 1.5, max 30s, up to 5 attempts

### Deduplication

When a user sends a message, the response arrives both from the server action (optimistic update) and from the realtime subscription. The hooks deduplicate by matching optimistic `tmp-*` IDs against incoming server IDs within a 10-second window.

## Sync Fallback

For unreliable connections, a sync endpoint provides catch-up:

- **`/api/chat-sync`** — Cursor-based pagination endpoint. The client sends the ID of its last known message; the server returns all newer messages (up to 50 per page, max 5 pages per sync cycle).
- Rate-limited to one sync per 3 seconds (cooldown).
- Triggered on reconnection or when the realtime subscription may have missed messages.
- See [ADR-006](adr/006-cursor-based-sync-fallback.md) for design rationale.

### History Loading

The `/api/chat-history` endpoint loads older messages with cursor-based pagination for infinite scroll.

## Feature Hooks

Chat logic is encapsulated in feature hooks under `src/features/chat/hooks/`:

- Message list management (state, optimistic updates, deduplication)
- Realtime subscription management (connect, reconnect, event handling)
- Sync and history fetching (cursor tracking, loading states)
- Send/delete operations (server action calls with optimistic UI)
