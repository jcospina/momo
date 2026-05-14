# ADR-007: MoMo Streaming Transport

**Status:** Accepted
**Date:** 2026-05-14

## Context

Phase 5 wires the `@momo` agent into the live chat UI. The Phase 3 surface (`/api/momo-test` + `/home/momo-test`) used synchronous `runAgent` — the user waited for the full answer, then saw it. Modern AI chat experiences stream tokens as they arrive, and MoMo users expect the same. We need a streaming transport for the new `/api/momo-stream` route that fits the existing stack and the Phase 4 persistence model (`sendMomoMessage` + DB-enforced `idempotency_key`).

Options considered:

1. **Custom SSE handler** — emit `text/event-stream` directly. Full control, but every framing detail becomes our problem, and `EventSource` doesn't support `POST`.
2. **WebSockets** — bidirectional, but overkill for a one-shot turn. Adds connection lifecycle and auth-on-upgrade concerns the existing deployment doesn't need.
3. **RSC `streamUI`** — couples the agent transport to React Server Components and is awkward to integrate with the existing client-side chat hooks that already own message state.
4. **Vercel AI SDK `streamText().toTextStreamResponse()`** — returns a `Response` whose body is a plain text stream, consumed on the client with `fetch` + `response.body.getReader()`.

## Decision

Use the Vercel AI SDK `streamText().toTextStreamResponse()` from the existing `streamAgent` orchestrator (`src/agent/agent-core.ts`) and consume the response on the client with `fetch` + `response.body.getReader()`.

- The `ai` package is already a direct dependency.
- `getReader()` is browser-native — no extra client library, no SSE parser.
- The payload is plain incremental text, which matches the chat UI's render contract (tool calls and "thinking" steps stay hidden per Phase 5 guardrails).
- `POST` works naturally with `fetch`, unlike `EventSource`.

The persistence handshake on `/api/momo-stream`:

- The route calls `streamAgent` with an `onFinish` callback.
- When the model finishes, `onFinish` invokes `sendMomoMessage` with `idempotency_key = momo:${triggeringMessageId}`.
- The unique partial index on `chat_messages.idempotency_key` dedupes if the route is retried (e.g. client reconnect spawning a fresh request). `sendMomoMessage` already handles 23505 by reading back the existing row and returning `reused: true`, so retries are safe by construction.
- The assistant message flows through the existing realtime + `/api/chat-sync` fallback path, preserving timeline ordering on refresh/reconnect.

## Consequences

**Benefits:**

- Zero new dependencies.
- Browser-native consumption keeps the client small and portable.
- Plain text framing has no event model to maintain.
- Streaming runs inside the existing Next.js route handler — no new runtime.
- Idempotency lives in the database, so the route stays stateless and retries cannot duplicate.

**Trade-offs:**

- Plain text intentionally hides tool calls from the wire; debugging tool traces requires server-side logs rather than wire-level inspection. The Phase 3 `/api/momo-test` surface that exposed traces is removed in this same change.
- Coupled to the `ai` package's streaming contract. The surface used is small (`streamText`, `onFinish`, `toTextStreamResponse`), so migration cost on a major version bump is bounded.
- If we later need richer client-side frames (progress events, partial tool results), we will need to evolve beyond plain text — either by adopting the AI SDK's data-stream protocol or by layering small framing on top. Acceptable for v1, which is one-shot and answer-only.
