---
version: 1.0
last_updated: 2026-03-17
---

# Chat System

## Overview

MoMo's primary interface is a chat where users type expenses as messages. The chat supports personal and household scopes with realtime updates, optimistic UI, and sync fallback.

## Scope Model

Users can toggle between two scopes:

- **Personal** — Messages where `household_id IS NULL`, visible only to the sender.
- **Household** — Messages with a `household_id`, visible to household members via RLS.

The chat UI keeps both datasets in memory, but realtime subscription/sync is enabled for the active tab.

## Message Lifecycle

### Send + Processing Flow

1. Client adds an optimistic `tmp-*` message with status `pending`.
2. `messages` facade `send()` calls the internal send action.
3. The action inserts the row in `chat_messages` with `pending`.
4. `processChatMessage()` runs synchronously (parse + expense persistence).
5. Message status becomes final (`processed`, `needs_category`, `no_expense`, or `failed`).
6. Action returns the latest persisted message and the client reconciles optimistic state.

### Message Status

| Status | Meaning |
| -------- | --------- |
| `pending` | Inserted, waiting for processing |
| `processed` | Expense(s) created and categorized |
| `needs_category` | Expense(s) created but at least one has no category |
| `no_expense` | No parseable expense found |
| `failed` | Processing or persistence error |

See [ADR-001](adr/001-synchronous-chat-processing.md).

## Realtime

### Shared Client

A single Supabase realtime client is shared via `RealtimeClientProvider` and reused by chat hooks. See [ADR-002](adr/002-single-shared-realtime-client.md).

### Subscriptions

Realtime hooks subscribe to `chat_messages` with `event: '*'` and handle `INSERT`, `UPDATE`, and `DELETE` payloads.

- Personal channel filter: `user_id=eq.<current-user>` plus client-side `household_id == null` guard.
- Household channel filter: `household_id=eq.<active-household-id>`.

### Reconnect + Stall Strategy

Current constants (`src/features/chat/chat.constants.ts`):

- Stall check interval: **60s**
- Stall threshold (visible tab): **90s**
- Stall threshold (hidden tab): **5m**
- Resubscribe backoff: base **1s**, factor **2**, max delay **5s**, max attempts **3**

### Deduplication

Incoming server messages are reconciled against optimistic `tmp-*` messages by matching content/user/scope and timestamp proximity (10s window).

## Sync Fallback

The sync path uses `POST /api/chat-sync` via `messages` facade `getSince()`.

- Default/max page limit: **100** messages
- Household sync uses cursor pagination and can fetch up to **5 pages** per sync run.
- Sync cooldown: **10s** between runs.
- Triggered on reconnection (error -> subscribed), tab visibility return, and pending-message recovery paths.

See [ADR-006](adr/006-cursor-based-sync-fallback.md).

## History Loading

Older messages are loaded through `POST /api/chat-history` with cursor pagination.

- Default page limit: **30**
- Max page limit: **100**

## Feature Hooks

Chat logic lives in `src/features/chat/hooks/`:

- state + optimistic lifecycle (`use-chat-state`)
- realtime lifecycle (`use-personal-realtime`, `use-household-realtime`)
- sync fallback (`use-personal-sync`, `use-household-sync`)
- composer behavior (`use-composer`)
