---
version: 1.0
last_updated: 2026-05-14
---

# ADR-007: MoMo Streaming Transport

## Context

Users address the `@momo` agent inside the chat UI and expect to see its reply appear token-by-token, the way modern AI chat experiences behave. The transport that carries those tokens from the agent route handler to the browser has to fit MoMo's existing stack: a Next.js route handler on a serverless runtime, a client-side chat hook that already owns message state, and a persistence layer that records the final assistant message through `sendMomoMessage` with a DB-enforced unique `idempotency_key`.

Options considered:

1. **Custom SSE handler** — emit `text/event-stream` directly. Full control, but every framing detail becomes our problem, and `EventSource` does not support `POST`.
2. **WebSockets** — bidirectional, but overkill for a one-shot turn. Adds connection lifecycle and auth-on-upgrade concerns the existing deployment does not need.
3. **RSC `streamUI`** — couples the agent transport to React Server Components and is awkward to integrate with the client-side chat hooks that already own message state.
4. **Vercel AI SDK `streamText().toTextStreamResponse()`** — returns a `Response` whose body is a plain text stream, consumed on the client with `fetch` + `response.body.getReader()`.

## Decision

MoMo's streaming transport uses the Vercel AI SDK `streamText().toTextStreamResponse()` from the `streamAgent` orchestrator (`src/agent/agent-core.ts`) and consumes the response on the client with `fetch` + `response.body.getReader()`.

- The `ai` package is already a direct dependency.
- `getReader()` is browser-native — no extra client library, no SSE parser.
- The payload is plain incremental text, which matches the chat UI's render contract (tool calls and "thinking" steps stay hidden).
- `POST` works naturally with `fetch`, unlike `EventSource`.

The persistence handshake on the agent route:

- The route calls `streamAgent` with an `onFinish` callback.
- When the model finishes, `onFinish` invokes `sendMomoMessage` with `idempotency_key = momo:${triggeringMessageId}`.
- The unique partial index on `chat_messages.idempotency_key` dedupes if the route is retried (for example, a client reconnect spawning a fresh request). `sendMomoMessage` handles the resulting unique-violation by reading back the existing row and returning `reused: true`, so retries are safe by construction.
- The assistant message flows through the existing realtime + `/api/chat-sync` fallback path, preserving timeline ordering on refresh and reconnect.

## Consequences

**Benefits:**

- Zero new dependencies.
- Browser-native consumption keeps the client small and portable.
- Plain text framing has no event model to maintain.
- Streaming runs inside the existing Next.js route handler — no new runtime.
- Idempotency lives in the database, so the route stays stateless and retries cannot duplicate.

**Trade-offs:**

- Plain text intentionally hides tool calls from the wire; debugging tool traces requires server-side logs rather than wire-level inspection.
- If the stream cuts mid-flight before `onFinish` runs, no assistant row is persisted; the client sees a partial reply that disappears on reload. The user can re-mention `@momo` to retry, and the idempotency key ensures a retried request that does complete inserts exactly one row.
- Coupled to the `ai` package's streaming contract. The surface used is small (`streamText`, `onFinish`, `toTextStreamResponse`), so migration cost on a major version bump is bounded.
- If richer client-side frames are needed later (progress events, partial tool results), the transport will need to evolve beyond plain text — either by adopting the AI SDK's data-stream protocol or by layering small framing on top. Acceptable for the current one-shot, answer-only interaction.
