---
version: 2.0
last_updated: 2026-05-11
---

# Implementation Plan: `@momo` Agent on Cloudflare

Date: 2026-04-23 (v1.0), 2026-05-11 (v2.0 scope reduction)  
Owner: MoMo engineering  
Status: Active plan for v1. Multi-turn session management and follow-up handling are explicitly deferred to v2 — see "Out of Scope for v1" below.  
Decision: Use Cloudflare Agents SDK + Durable Objects as the AI runtime (app DB remains canonical timeline).  
Scope: v1 is a tag-only, one-shot assistant. Each `@momo` mention is answered with a fresh context — no conversational memory, no follow-up resolution, no session linkage across turns. The system prompt is expected to steer users away from follow-up prompts so the one-shot interaction model is learned.

## Goal

Ship a safe, read-only, mention-triggered `@momo` assistant that answers each tagged question as a one-shot turn inside the existing chat timeline, without breaking current expense-processing behavior. Conversational memory and follow-up handling are out of scope for v1.

## Guardrails (must hold through all phases)

- `@momo` runs only when user message includes `@momo`.
- Existing expense lifecycle semantics remain unchanged for untagged messages.
- `chat_messages` in app DB stays canonical source of truth.
- Context sent to the model is the single tagged user message only — no prior chat history, no cross-turn memory, no thread state.
- Agent tools are read-only and scope-aware (`personal` vs `household`).
- Data access remains behind `src/lib/data/*` facades; UI stays data-source agnostic.
- Keep facade contracts backward compatible (`payload` + optional `errorCode`).
- v1 must not introduce schema fields, facade methods, or runtime constructs that presuppose multi-turn sessions, follow-ups, or thread state.

## Phase 1: Tool + Eval Design (before agent implementation)

Objective: Define what the agent can do, and evaluate behavior with mocks before touching production data paths.

High-level work:
- Define initial tool contract set (inputs, outputs, auth/scope checks, error shapes).
- Create mock tool implementations and synthetic datasets for both `personal` and `household` scopes.
- Build eval suite for core tasks:
  - product help correctness
  - spending-insight correctness
  - refusal behavior for unsupported asks
  - scope isolation and leakage prevention
  - deterministic fallback responses on failures
- Define pass/fail thresholds and regression gating criteria.

Exit criteria:
- Versioned tool specs exist.
- Mock-backed eval harness exists and runs locally.
- Baseline prompts/system rules and refusal patterns are validated against target thresholds.

## Phase 2: Build Real Tools (based on eval outcomes)

Objective: Implement production tool adapters using the proven contracts from Phase 1.

High-level work:
- Implement server-side, read-only tools for:
  - stats summary by period/scope
  - top categories
  - product behavior explanations
- Enforce per-tool auth + scope checks inside tool handlers.
- Add tool-level observability (latency, success/failure, refusal reason categories).
- Re-run evals against real tools and tune prompts/contracts where needed.

Exit criteria:
- Real tools meet or exceed Phase 1 eval baselines.
- Tool errors map cleanly to deterministic user-safe responses.
- No direct model access to raw DB or SQL generation.

## Phase 3: Local Agent Runtime Testing (Cloudflare + Wrangler)

Objective: Validate agent runtime behavior locally via a dedicated test surface, before any chat integration. Phase 3 is **not** concerned with `@momo` detection — the trigger is purely a chat-UI concern handled in Phase 5, stripped from the message, and never reaches the agent.

High-level work:
- Set up Cloudflare Agent + Durable Object locally using Wrangler.
- Implement the one-shot request flow in the agent runtime:
  - accept a single user question as the only input
  - call model with bounded tools
  - return structured assistant output
- Drive the agent from a dedicated test page/route (not the real chat) for manual validation of simple questions.
- Validate reliability scenarios locally:
  - retries/idempotency behavior of the request handler
  - timeout handling
  - duplicate request protection
- Verify local streaming and reconnection behavior for a single turn.

Exit criteria:
- Local worker/agent environment runs end-to-end via Wrangler, driven from the test surface.
- Agent answers simple, well-formed questions reliably with real tool calls.
- Error behavior is deterministic under repeated test runs.
- Idempotency strategy is validated locally before DB write integration in Phase 4.

## Phase 4: Schema + API Facade Adjustments

Objective: Add the minimal chat metadata and API boundaries needed to persist `@momo` replies safely, without introducing session state.

High-level work:
- Add additive schema changes to tag assistant messages and their trigger (for example: `author_kind`, `momo_message_kind`, `momo_source`, `momo_invocation_tagged`). Explicitly do **not** add session ids, parent linkage, or thread state — v1 is stateless.
- Add/adjust data-layer facades for:
  - assistant message persistence with idempotency keys derived from the triggering user message
  - rendering hints so the timeline can distinguish assistant replies from user turns
- Keep client/server split strict (`client.ts` vs `server.ts`) and preserve existing facade contracts.
- Add targeted tests for assistant-message persistence, correct ordering against the triggering message, and backward compatibility for untagged traffic.

Exit criteria:
- Migrations are additive and reversible.
- Existing chat/expense flows pass unchanged for untagged traffic.
- Assistant replies persist exactly once per tagged user message, with no session-state coupling.

## Phase 5: UI Integration for `@momo` Mentions

Objective: Integrate agent behavior into chat UX only after backend/runtime is stable.

High-level work:
- Detect `@momo` mentions in the chat send flow; the mention is a routing trigger only.
- Route tagged messages through the new server-side AI facade.
- Strip the `@momo` token from the message before forwarding to the agent; the agent never sees the trigger, only the question.
- Send only the stripped user question as input; do not attach prior chat history, prior assistant replies, or thread state.
- Render assistant replies in timeline with new metadata while preserving realtime + `/api/chat-sync` fallback ordering.
- Keep untagged messages on existing expense-processing path.
- Surface the one-shot interaction model in the UI where appropriate (for example: no visible "reply to" affordance on assistant messages).

Exit criteria:
- Tagged and untagged flows coexist without regression.
- Assistant replies render correctly and consistently across refresh/reconnect.
- No leakage of untagged messages or prior turns into model context.

## Phase 6: Cloudflare Deployment + Expanded Testing

Objective: Deploy safely and validate behavior in staging/production-like conditions.

High-level work:
- Provision Cloudflare environments (staging + production), secrets, and routing.
- Deploy workers/agents via CI with environment-specific config.
- Run expanded testing:
  - integration and end-to-end mention flows
  - load and concurrency scenarios for bursty mentions
  - fault injection (provider/API failures, timeouts, retries)
- Roll out behind `ai_enabled` flag with kill switch.

Exit criteria:
- Deployment is repeatable and observable.
- SLO/SLI baselines are defined (latency, error rate, duplicate rate).
- Rollback and kill-switch procedures are documented and tested.

## Phase 7: Polish, Hardening, and Launch

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

- Evaluation suite and benchmark history (Phase 1 onward).
- Versioned tool contracts and compatibility notes.
- Architecture decision records for runtime/schema tradeoffs.
- Observability dashboards for latency/errors/tool usage/refusal categories.
- Rollout and rollback playbooks.

## Suggested Milestone Gates

1. Gate A: "Eval-ready" after Phase 1.
2. Gate B: "Tool-complete" after Phase 2.
3. Gate C: "Runtime-stable" after Phase 3.
4. Gate D: "Data-contract-stable" after Phase 4.
5. Gate E: "UX-integrated" after Phase 5.
6. Gate F: "Production-ready" after Phase 6.
7. Gate G: "Launch" after Phase 7.
