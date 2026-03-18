# AGENTS.md

## Mission

MoMo is a chat-first expense tracker for `personal` and `household` scopes.
This file captures non-obvious guardrails and decision defaults for coding
agents. Keep changes safe, minimal, and behavior-compatible.

## Instruction Priority

Follow this order: **user task** > **Hard Constraints (MUST)** > **Agent Decision Defaults (SHOULD)** > **Reference Docs**.

## Hard Constraints (MUST)

- Enforce the data boundary: UI layers (`src/app`, `src/components`, `src/features`, `src/hooks`, `src/providers`) access data through `src/lib/data/*` facades.
- Keep `src/ui/` presentational and data-source agnostic (no Supabase imports or domain IO).
- Do not import transport internals in UI layers (`@supabase/*`, `@lib-supabase/*`, `@actions/*`, `@helpers/*`, or raw `/api/*` calls for migrated scope).
- Keep server/client split strict: client code never imports `src/lib/data/**/server.ts`; server code never imports `src/lib/data/**/client.ts`.
- Preserve chat behavior semantics: `pending` -> `processed | needs_category | failed | no_expense`, with realtime + `/api/chat-sync` fallback and deterministic ordering.
- Keep route protection behavior aligned with `src/proxy.ts` and `src/lib/proxy/rules/*`.
- Keep facade result contracts backward compatible (`payload + optional errorCode`) unless the user explicitly asks for contract changes.

## Agent Decision Defaults (SHOULD)

- Start with focused reading of relevant code/tests and form a concrete hypothesis before editing.
- Prefer the smallest change that fully solves the task while preserving architecture boundaries.
- Resolve ambiguity through local discovery first; ask the user only when risk is high and code/docs cannot settle it.
- When tradeoffs exist, pick the option with lower regression risk and clearly state assumptions in the final summary.
- Complete tasks end-to-end when feasible (implementation + targeted verification), not just partial analysis.
- Run targeted checks/tests first, then broaden to full `pnpm lint`, `pnpm format:check`, and `pnpm test` only when scope/risk warrants it.
- If the user is making a wrong statement say so
- Ask as many clarifying questions as needed when something is not clear or before commiting on large scale tasks.

## Reference Docs

Use only when the task needs extra context:

- [`README.md`](README.md)
- [`docs/`](docs/) core set (architecture, database, chat-system, expense-system, stats-system, auth-and-households, ADRs) plus [`implementations/decouple-data-layer/`](implementations/decouple-data-layer/) plan and progress
