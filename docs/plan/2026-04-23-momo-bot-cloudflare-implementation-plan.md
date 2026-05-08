---
version: 1.0
last_updated: 2026-05-08
---

# Implementation Plan: `@momo` Agent on Cloudflare

Date: 2026-04-23  
Owner: MoMo engineering  
Status: Historical planning artifact. Revalidate this document against live code before using it for implementation decisions; it is not the current architecture source of truth.
Decision: Use Cloudflare Agents SDK + Durable Objects as the AI runtime (app DB remains canonical timeline)

## Goal

Ship a safe, read-only, mention-triggered `@momo` assistant that works inside the existing chat timeline without breaking current expense-processing behavior.

## Guardrails (must hold through all phases)

- `@momo` runs only when user message includes `@momo`.
- Existing expense lifecycle semantics remain unchanged for untagged messages.
- `chat_messages` in app DB stays canonical source of truth.
- Context sent to the model is strictly filtered to the current `momo_session_id` and tagged user turns.
- Agent tools are read-only and scope-aware (`personal` vs `household`).
- Data access remains behind `src/lib/data/*` facades; UI stays data-source agnostic.
- Keep facade contracts backward compatible (`payload` + optional `errorCode`).

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

Objective: Validate agent runtime behavior locally before app integration.

High-level work:
- Set up Cloudflare Agent + Durable Object locally using Wrangler.
- Implement mention-turn flow in the agent runtime:
  - load filtered context
  - call model with bounded tools
  - return structured assistant output
- Validate reliability scenarios locally:
  - retries/idempotency behavior
  - timeout handling
  - duplicate request protection
  - session continuity and expiry behavior
- Verify local streaming and reconnection behavior.

Exit criteria:
- Local worker/agent environment runs end-to-end via Wrangler.
- Session and error behavior are deterministic under repeated test runs.
- Idempotency strategy is validated before DB write integration.

## Phase 4: Schema + API Facade Adjustments

Objective: Add required chat metadata and API boundaries to support `@momo` sessions safely.

High-level work:
- Add additive schema changes for assistant/session metadata (for example: `author_kind`, `momo_session_id`, `momo_message_kind`, `momo_source`, `momo_invocation_tagged`, optional parent linkage).
- Add/adjust data-layer facades for:
  - session resolution and expiry policy
  - context assembly with strict inclusion/exclusion rules
  - assistant message persistence with idempotency keys
- Keep client/server split strict (`client.ts` vs `server.ts`) and preserve existing facade contracts.
- Add targeted tests for context filtering, ordering, and backward compatibility.

Exit criteria:
- Migrations are additive and reversible.
- Existing chat/expense flows pass unchanged for untagged traffic.
- New facades support mention-triggered AI flow without UI-layer transport coupling.

## Phase 5: UI Integration for `@momo` Mentions

Objective: Integrate agent behavior into chat UX only after backend/runtime is stable.

High-level work:
- Detect `@momo` mentions in chat send flow.
- Route tagged messages through the new server-side AI facade.
- Pass only relevant context/session identifiers; keep canonical writes in app DB.
- Render assistant replies in timeline with new metadata while preserving realtime + `/api/chat-sync` fallback ordering.
- Keep untagged messages on existing expense-processing path.

Exit criteria:
- Tagged and untagged flows coexist without regression.
- Assistant replies render correctly and consistently across refresh/reconnect.
- No leakage of untagged messages into model context.

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
