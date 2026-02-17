# ADR-002: Single Shared Realtime Client

**Status:** Accepted
**Date:** 2026-02-17

## Context

MoMo's chat requires realtime updates for two scopes simultaneously: personal messages and household messages. Each scope needs its own Supabase Realtime channel subscription. The question was whether to create per-component realtime clients or share a single client across the app.

## Decision

A single Supabase Realtime client is created and shared via `RealtimeClientProvider` (React context). Components and hooks subscribe to channels through this shared client rather than creating their own connections.

## Consequences

**Benefits:**

- Single WebSocket connection — reduces resource usage and avoids connection limits.
- Centralized lifecycle — connect/disconnect/reconnect logic lives in one place.
- Dual-scope subscriptions coexist naturally on the same client.
- Easier to implement connection status monitoring and reconnection handling.

**Trade-offs:**

- Channel management must be careful — subscribing and unsubscribing channels on a shared client requires tracking active subscriptions to avoid premature cleanup.
- A reconnection event affects all subscriptions simultaneously, which is actually desirable (all channels need to re-sync) but adds complexity to the reconnect handler.
- The provider must be mounted high enough in the component tree that all consumers can access it, coupling the realtime lifecycle to the app's mount lifecycle.
