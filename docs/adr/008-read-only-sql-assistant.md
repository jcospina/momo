---
version: 1.0
last_updated: 2026-11-09
---

# ADR-008: Read-only SQL for MoMo questions

## Context

The assistant's fixed date, row-search and spending-statistics tools constrained
questions to predefined filters and aggregations. Database failures could become
empty successful results. Aluna demonstrates a more flexible pattern: inspect
stored vocabulary, interpret the question, run parameterized SQL, and answer from
the results. The semantic interpretation comes from the model, not SQLite or an
embedding index.

## Decision

Expose only `querySql(scope, sql, parameters)`. The existing streaming transport
and message persistence remain as specified in ADR-007. The default model is
`gpt-6-luna`, medium reasoning, with parallel tool calls disabled. The installed
OpenAI provider needs `forceReasoning` because its model-name list predates Luna.
`MOMO_AGENT_MODEL` remains an override for compatible reasoning models.

A turn may execute ten SQL queries, including failures, followed by a final
answer turn with tools disabled. The executor also enforces ten calls independently
of the model. SQL can use joins, CTEs, windows, JSON and aggregates. Failed queries
return feedback; failed data loading never becomes a successful zero total.

Authorization happens before SQL:

- Load expenses using the authenticated Supabase client and RLS.
- Personal scope explicitly filters to the current user and selected currency.
- Household scope verifies membership and filters to that household and currency.
  A household selected in chat is verified. In personal chat, a household question
  resolves the user's membership, as the previous tools did.
- Cache the authorized rows per scope for the turn. Model SQL never sees credentials,
  another user's private rows, or the application database connection.

Each query runs against those rows in a new in-memory SQLite worker. Only one
SELECT or WITH statement is accepted, with SQLite `query_only` enabled after
loading. The worker has no application database attached. Its bundled SQL engine
has no host file functions. The model cannot issue ATTACH, PRAGMA or mutations.

Typed notes and their derived tags are the primary evidence. Merchant is optional
metadata and is not derived by the entry parser. The read-only
`expense_tags(expense_id, tag)` view exposes distinct normalized pairs for direct
filtering and grouping. Saved tags are supplemented with the output of the same
`extractTagNgrams` function used by expense entry, covering legacy missing or
incomplete tags without changing the source rows. Missing categories project as
`uncategorized` so expense-only queries do not silently lose them. The expanded
snapshot still obeys the size bounds below.

Tag groups overlap: a meal can match its activity, place and combined phrase.
Totals use distinct expense IDs/EXISTS; group totals cannot be assumed additive.
The prompt prioritizes exact discovered tag values, semantic interpretation and
candidate-note review, with populated merchant values as supporting evidence.

Bounds fail explicitly instead of returning incomplete answers:

| Resource | Limit |
| --- | --- |
| Authorized rows per scope | 20,000 / 8 MiB |
| SQL text / serialized input | 16 KiB / 32 KiB |
| Bound parameters | 100 |
| Result per query | 200 rows / 16 KiB |
| Results per turn | 64 KiB |
| Worker wall time | 5 seconds per query, including initialization |
| SQLite allocator | Verified 32 MiB hard heap limit |
| Worker V8 old generation | 64 MiB |

`normalize_text` provides case/accent normalization. `format_money` returns an
explicit currency string using MoMo's existing storage convention: COP values
are whole pesos; USD/EUR values are cents. The prompt requests raw amounts plus
formatted values and instructs the model to quote the latter verbatim.

## Verification and limitations

Local evaluations use the production prompt, model settings, loop and SQLite
executor with frozen synthetic fixtures. They do not require Docker, reset a
database or publish traces to a hosted evaluation service. See
[`evals/local/README.md`](../../evals/local/README.md) and its findings report.
The primary fixture is calibrated to aggregate characteristics of the active
household; its identities, amounts and entries are synthetic. Earlier generic
fixtures remain available as a separate legacy suite.

Tests exercise tenant filtering, failure propagation, SQL writes/escapes, output
and allocation limits, timeout interruption, and an actual AI SDK loop that makes
ten queries and then answers in both generated and streamed modes. A production
build smoke check is required because a bundler may rewrite module resolution;
the worker uses Node `createRequire` to resolve a real path at runtime.

The source fetch consists of paginated Supabase reads, not an atomic transaction
snapshot. Concurrent writes during loading can affect the assembled rows. The
loaded rows are stable for subsequent queries in that turn. Histories above the
limits fail explicitly; large-history support would require a different design.
SQLite memory and V8 heap bounds do not describe total process RSS.

Legacy aggregation migrations remain installed but are no longer assistant tools.
This change requires no schema migration. Deployment and authenticated live-database
validation are separate from the local fixture and build evidence.
