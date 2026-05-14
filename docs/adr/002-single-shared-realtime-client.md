---
version: 1.0
last_updated: 2026-03-17
---

# ADR-002: Single Shared Realtime Client

## Context

MoMo chat supports personal and household scopes. The active scope can change as users toggle tabs, and each scope uses its own channel filter. The decision point was whether to create isolated realtime clients per hook/component or share one realtime client across the app.

## Decision

Create and share a single Supabase realtime client via `RealtimeClientProvider` (React context). Chat hooks subscribe/unsubscribe channels on this shared client based on active scope state.

## Consequences

**Benefits:**

- Single WebSocket connection for app-level realtime.
- Centralized lifecycle and token handling.
- Consistent reconnect semantics across personal and household channels.
- Lower risk of duplicate subscriptions from component-level client creation.

**Trade-offs:**

- Shared client requires careful channel cleanup when scope changes.
- Reconnects affect all active channels at once.
- Provider placement couples realtime lifecycle to app layout mount.
