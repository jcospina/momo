---
version: 3.1
last_updated: 2026-05-13
---

# Implementation Plan: `@momo` Agent

**Date:** 2026-04-23 (v1.0), 2026-05-11 (v2.0 scope reduction), 2026-05-13 (v3.0 runtime change + progress tracking), 2026-05-13 (v3.1 Phase 4 landed)

**Owner:** MoMo engineering  

**Status:**
Active plan for v1. Phases 1–4 are complete. Phase 5 is next. Multi-turn session management and follow-up handling remain deferred to v2 — see "Out of Scope for v1" below.  

**Runtime decision:**
The agent runs inside the Next.js app as a server-side handler. There is no separate worker runtime — that approach was evaluated and dropped in favor of keeping the agent co-located with the rest of the app backend (see commit `6ca7b30`).  

**Eval decision:**
Evals exercise the **same production code path** as the live agent (same `runAgent` orchestrator, same `productionToolExecutors`, same Supabase). The only differences are a local Supabase pre-seeded with fixture users, households, and expenses, and a date-anchored wrapper around `resolveDateRange` so relative periods stay deterministic across runs. 

**Scope:** v1 is a tag-only, one-shot assistant. Each `@momo` mention is answered with a fresh context — no conversational memory, no follow-up resolution, no session linkage across turns. The system prompt is expected to steer users away from follow-up prompts so the one-shot interaction model is learned.

> **Note on the filename.** This file is still named `…-cloudflare-implementation-plan.md` for historical continuity, but the Cloudflare runtime is no longer part of the plan. Treat the filename as a versioning artifact, not a description of the architecture.

## Progress Summary

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Tool + Eval Design | ✅ Complete | Tool contracts in `src/agent/types.ts`; eval taxonomy in `evals/momo-agent-cases.ts`; harness in `evals/momo-agent.eval.ts`. |
| 2. Build Real Tools | ✅ Complete | Real Supabase executors in `src/agent/tools/supabase-executors.ts`, backed by `supabase/migrations/20260506120000_agent_spending_stats_rpc.sql`. |
| 3. Local Agent Runtime | ✅ Complete | Agent runs end-to-end via `src/app/api/momo-test/route.ts` driven by `src/app/home/momo-test/page.tsx`. Worker-runtime exploration was removed in commit `6ca7b30`. |
| 4. Schema + API Facade Adjustments | ✅ Complete | `chat_messages` gains `author_kind`, `momo_source`, `idempotency_key`, `momo_invocation_tagged` via `supabase/migrations/20260513120000_momo_chat_message_authorship.sql`; new `sendMomoMessage` action + `sendMomo` server facade with DB-enforced idempotency. |
| 5. UI Integration for `@momo` Mentions | ⏳ Not started | Next gate. |
| 6. Deployment + Expanded Testing | ⏳ Not started | Reuses the existing Next.js app deployment pipeline. |
| 7. Polish, Hardening, and Launch | ⏳ Not started | |

## Guardrails (must hold through all phases)

- `@momo` runs only when user message includes `@momo`.
- Existing expense lifecycle semantics remain unchanged for untagged messages.
- `chat_messages` in app DB stays canonical source of truth.
- Context sent to the model is the single user question only — no prior chat history, no cross-turn memory, no thread state. The `@momo` token itself is stripped before reaching the agent.
- Agent tools are read-only and scope-aware (`personal` vs `household`).
- Data access remains behind `src/lib/data/*` facades; UI stays data-source agnostic.
- Keep facade contracts backward compatible (`payload` + optional `errorCode`).
- v1 must not introduce schema fields, facade methods, or runtime constructs that presuppose multi-turn sessions, follow-ups, or thread state.
- Evals and production must share a single code path. If a behavior can only be reproduced in one and not the other, that is a defect, not a feature.

## Phase 1: Tool + Eval Design ✅ Complete

Objective: Define what the agent can do, and evaluate behavior with realistic data before exposing it to users.

Outcome:
- Tool contracts defined in `src/agent/types.ts` (`ResolveDateRangeInput`, `QueryExpensesInput`, `GetSpendingStatsInput` + result types).
- System prompt and currency-aware formatting rules in `src/agent/constants.ts`.
- Eval taxonomy in `evals/momo-agent-cases.ts` covering time aggregation, recurrence, category breakdown, savings rate, frequency, filtered totals, trend, household scope, and privacy/safety.
- Multi-currency fixture datasets under `evals/` (COP/EUR/USD).
- Eval harness in `evals/momo-agent.eval.ts` driven by `npm run agent:eval` (Braintrust).

Note: The original plan called for separate mock tool implementations and a mock-backed eval harness. That approach was superseded — evals now run against the real Supabase executors with seeded fixtures, which is a stronger guarantee than mock-backed evals and keeps the test surface aligned with production.

## Phase 2: Build Real Tools ✅ Complete

Objective: Implement production tool adapters using the proven contracts from Phase 1.

Outcome:
- Real, read-only executors in `src/agent/tools/supabase-executors.ts`:
  - `resolveDateRange` — period parsing
  - `queryExpenses` — paginated, scope-filtered row reads
  - `getSpendingStats` — aggregated totals with groupBy + tags sidecar
- Supabase RPC for aggregation: `supabase/migrations/20260506120000_agent_spending_stats_rpc.sql`, with auth/scope checks enforced inside the function (`auth.uid()` + `personal` vs `household` predicates).
- Shared analytics helpers in `src/agent/tools/expense-analytics.ts`.
- Tool-level traceability via `src/agent/trace.ts` (`normalizeToolCalls`).
- Tests in `src/agent/tools/supabase-executors.test.ts` and adjacent files.
- No direct model access to raw SQL — the model only sees the typed tool surface.

## Phase 3: Local Agent Runtime ✅ Complete

Objective: Validate agent runtime behavior locally via a dedicated test surface, before any chat integration. Phase 3 is **not** concerned with `@momo` detection — the trigger is purely a chat-UI concern handled in Phase 5, stripped from the message, and never reaches the agent.

Outcome:
- Agent orchestrator in `src/agent/agent-core.ts` (`runAgent`, `streamAgent`) using the Vercel AI SDK with bounded `max_steps`.
- Test API route at `src/app/api/momo-test/route.ts` and manual test UI at `src/app/home/momo-test/page.tsx` (+ `momo-test-client.tsx`).
- Agent answers simple, well-formed questions reliably with real tool calls in both local manual testing and eval runs.
- The agent runs inside the Next.js app as a regular server-side handler — no separate worker runtime, no Durable Object, no Wrangler. The earlier exploration of that path was removed in commit `6ca7b30`.
- Evals and the test route call the same orchestrator (`runAgent`) with the same `productionToolExecutors`; only the date-resolution wrapper differs in evals to keep relative periods deterministic.

Open items intentionally deferred to later phases:
- Idempotency on persistence is deferred to Phase 4, where the assistant write is introduced. There is no DB write in the agent path today, so there is nothing to dedupe at this layer yet.
- Streaming/reconnect behavior in the real chat timeline is part of Phase 5.

## Phase 4: Schema + API Facade Adjustments ✅ Complete

Objective: Add the minimal chat metadata and API boundaries needed to persist `@momo` replies safely, without introducing session state.

Outcome:
- Additive migration `supabase/migrations/20260513120000_momo_chat_message_authorship.sql` adds enum `message_author_kind` (`'user' | 'momo'`) and four columns on `chat_messages`: `author_kind`, `momo_source`, `idempotency_key`, `momo_invocation_tagged`. A unique partial index on `idempotency_key` enforces dedup at the DB layer; no FK/parent linkage was introduced.
- New server action `sendMomoMessage` in `src/lib/actions/chat-messages.ts` writes MoMo rows idempotently — on 23505 it reads back the existing row and returns `reused: true`. MoMo rows skip the expense lifecycle (`status='processed'` directly).
- New server-only facade method `sendMomo` in `src/lib/data/messages/server.ts` with matching `SendMomo` / `SendMomoInput` types in `src/lib/data/messages/types.ts`. Client facade is unchanged — MoMo persistence is server-only.
- `CHAT_MESSAGE_SELECT` consolidated into `src/lib/utils/chat-message.ts` and reused by the helper, the action, and `/api/chat-sync`. Same file exposes the `isMomoMessage` rendering hint for Phase 5.
- Tests at `src/lib/actions/chat-messages.test.ts` (action), `src/lib/utils/chat-message.test.ts` (type guard + helper), and extended `src/lib/data/messages/server.test.ts` (delegation).

Notes for Phase 5:
- `momo_invocation_tagged` is populated by the chat send flow when a user message contains `@momo`. The column exists; the wiring happens here.
- `isMomoMessage` is the hook Phase 5 uses in `src/components/chat/chat-message.tsx` to override `isOwn` for MoMo rows so they don't render as own.

## Phase 5: UI Integration for `@momo` Mentions ⏳ Next

Objective: Integrate agent behavior into chat UX only after the backend is stable. Real-chat integration uses **streaming** — not the synchronous `runAgent` used by the test route — so the experience matches what users expect from modern AI assistants.

High-level work:
- Detect `@momo` mentions in the chat send flow; the mention is a routing trigger only.
- Route tagged messages through a new server-side AI facade that invokes `streamAgent` (from `src/agent/agent-core.ts`) for incremental token delivery to the client.
- Strip the `@momo` token from the message before forwarding to the agent; the agent never sees the trigger, only the question.
- Send only the stripped user question as input; do not attach prior chat history, prior assistant replies, or thread state.
- Pick a streaming transport that fits MoMo's existing chat infrastructure (SSE, streamed `fetch`, or equivalent) and document the choice in an ADR.
- Show a **playful pre-stream loader** (emojis, light animation, brand-aligned copy) from the moment the user sends until the first token arrives. MoMo is for non-technical users and the brand voice is fun — the loading state should feel that way.
- During the stream, render assistant text incrementally as tokens arrive.
- Do **not** surface raw tool calls, JSON traces, or "thinking" steps in the chat UI. Tool execution is an implementation detail; the user sees a loader and then the final answer text. (Traces remain available for debugging on the `/api/momo-test` surface and in observability dashboards.)
- Persist the final assistant reply once the stream completes, using the Phase 4 metadata and idempotency key, so refresh/reconnect produces the same timeline ordering.
- Preserve realtime + `/api/chat-sync` fallback ordering for the persisted assistant message.
- Keep untagged messages on the existing expense-processing path.
- Surface the one-shot interaction model in the UI where appropriate (for example: no visible "reply to" affordance on assistant messages).
- Retire or gate the `/api/momo-test` + `/home/momo-test` surfaces once chat integration is live, so the test path is not a parallel production entry point.

Exit criteria:
- Tagged and untagged flows coexist without regression.
- Streaming experience feels comparable to mainstream AI chat UX (first-paint within a small delay, smooth token flow, no visible raw tool output).
- Pre-stream loader is visible from send-time until the first token, with no awkward blank gap.
- Assistant replies render correctly and consistently across refresh/reconnect after the stream finishes and the message is persisted.
- No leakage of untagged messages or prior turns into model context.

## Phase 6: Deployment + Expanded Testing ⏳ Not started

Objective: Deploy safely and validate behavior in staging/production-like conditions. Since the agent ships as part of the existing Next.js app, this phase reuses the app's deployment pipeline rather than introducing a separate runtime.

High-level work:
- Add environment-specific config and secrets for the agent (model provider keys, `MOMO_AGENT_MODEL`, etc.) to staging and production.
- Validate the agent end-to-end in staging against real auth and real Supabase data.
- Run expanded testing:
  - integration and end-to-end mention flows
  - load and concurrency scenarios for bursty mentions
  - fault injection (provider/API failures, timeouts, retries)
- Roll out behind an `ai_enabled` flag with a kill switch.

Exit criteria:
- Deployment is repeatable and observable using existing app deploy mechanics.
- SLO/SLI baselines are defined (latency, error rate, duplicate rate).
- Rollback and kill-switch procedures are documented and tested.

## Phase 7: Polish, Hardening, and Launch ⏳ Not started

Objective: Move from "working" to "launch-ready" with guardrails for sustained operation.

High-level work:
- Improve prompt/tool ergonomics from real telemetry and eval feedback.
- Add abuse controls and hardening (rate limits, safe refusals, prompt-injection safeguards).
- Finalize runbooks (incident response, degraded mode, on-call checks).
- Final UX/content polish for non-technical clarity.
- Launch progressively and monitor post-launch metrics.

Exit criteria:
- Launch checklist complete and signed off.
- Post-launch monitoring and alerting active.
- Known risks tracked with owners and follow-up milestones.

## Out of Scope for v1 (Deferred to v2)

The following capabilities are explicitly excluded from v1 and will be planned separately once v1 telemetry and the multi-user + agent chat interaction model are well understood. Architecture for these is intentionally **not** designed in v1.

- Follow-up turns or conversational memory across `@momo` mentions.
- Session identifiers, session expiry, or thread linkage between user/assistant messages.
- Cross-message context assembly (prior messages, prior tool calls, prior agent replies).
- Coordination between multiple household members interacting with the agent in the same thread.
- Server-side state for in-progress agent turns beyond the single request lifecycle.
- Any schema field, facade method, or runtime construct whose only purpose is to support the above.

The v1 system prompt will discourage follow-up prompts so users learn the one-shot interaction model.

## Cross-Phase Deliverables

- Evaluation suite and benchmark history (Phase 1 onward) — lives in `evals/` and exercises the production code path.
- Versioned tool contracts and compatibility notes — in `src/agent/types.ts`.
- Architecture decision records for runtime/schema tradeoffs — including the decision to keep the agent in the Next.js app rather than running it on a separate worker runtime.
- Observability dashboards for latency, errors, tool usage, and refusal categories.
- Rollout and rollback playbooks.

## Suggested Milestone Gates

1. Gate A: "Eval-ready" after Phase 1. ✅ passed
2. Gate B: "Tool-complete" after Phase 2. ✅ passed
3. Gate C: "Runtime-stable" after Phase 3. ✅ passed
4. Gate D: "Data-contract-stable" after Phase 4. ✅ passed
5. Gate E: "UX-integrated" after Phase 5.
6. Gate F: "Production-ready" after Phase 6.
7. Gate G: "Launch" after Phase 7.
