---
version: 1.0
last_updated: 2026-02-17
---

# ADR-001: Synchronous Chat Processing

## Context

When a user sends a chat message, the system needs to parse it into expense entries, persist those expenses, and update the message status. This processing could happen either synchronously (within the server action) or asynchronously (in a background job).

MoMo runs on a serverless platform (Vercel) where the runtime environment is ephemeral. Background jobs or queues are not natively available without additional infrastructure (e.g., a separate worker service, an external queue like SQS, or Supabase Edge Functions).

## Decision

Processing runs synchronously within the server action that handles message send. The server action inserts the message, calls `processChatMessage()`, and only returns after parsing and expense creation are complete.

## Consequences

**Benefits:**

- Guaranteed completion — if the server action returns successfully, the expenses exist.
- No infrastructure overhead — no queue, no worker, no retry logic to maintain.
- Simple error handling — failures are returned directly to the caller.
- Immediate status — the message status reflects the final processing result before the client sees it.

**Trade-offs:**

- The server action blocks until processing finishes, adding latency to the send operation. In practice this is fast (text parsing is CPU-bound and sub-100ms) but could become a concern if AI-assisted parsing is added later.
- If the server action times out (Vercel has function duration limits), the message is left in `pending` status with no automatic retry.
- No parallelism — each message is processed serially within its request.
