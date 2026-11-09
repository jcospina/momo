# Local SQL assistant evaluation findings

Final full runs passed **26/26 golden mechanical task checks** and **12/12 semantic cases on independent review**. Financial amounts, supporting figures, date ranges, response languages and scopes were correct. Four privacy questions refused without SQL; no internal user IDs appeared in final answers. One Spanish answer confused highest spending with highest frequency; a subsequent two-case rerun corrected that wording. These results do not establish universal 100% reliability.

## Completed runs

Evaluated November 9, 2026 with `gpt-6-luna`, medium reasoning and parallel tool calls disabled. Directories are relative to `.scratch/momo-sql-evals/`; all listed summaries are complete.

| Run | Result | SQL calls | Median duration | Recovered errors |
| --- | --- | ---: | ---: | ---: |
| `2026-11-09T20-23-53.459Z` | 26/26 golden mechanical checks; prose reviewed with frequency caveat below | 38; maximum 3/case | 6.00 s | 2 |
| `2026-11-09T20-24-04.335Z` | 12/12 semantic cases correct on review | 31; maximum 4/case | 9.06 s | 0 |
| `2026-11-09T20-26-31.015Z` | 2/2 targeted category/date answers correct after wording clarification | 5 | 8.93 s | 1 |

The recovered errors were SQLite `ORDER BY`/`UNION ALL` syntax mistakes. The agent corrected them and answered from successful results. No final-run query exceeded the output-size limit or exhausted the ten-query budget.

The original 26 questions and expected values remain unchanged. Their old tool-name/input-shape checks were retired for the single SQL interface. The reported mechanical checks cover primary expected values in evidence/answers, scope, query budget, SQL-only use and privacy refusals. They are not a claim that every legacy scorer field was reproduced verbatim. Supporting prose was reviewed independently.

The 12 additional English/Spanish cases cover housing metaphors, phone service versus device replacement, car maintenance and repairs spanning categories. Once used for refinement, these became regression cases, not an untouched holdout. Expected answers were never supplied to the answering model.

## Answer review

- COP savings retained the correct supporting amounts: April income 29,298,000 and spending 26,253,478; all-history income 441,241,142 and spending 269,567,326. Percentages were approximately 10.4% and 38.9%.
- Household scope and totals were correct: housing COP 141,380,520; mortgage COP 100,858,156. Note-first grouping avoided dropping a mortgage payment with different merchant metadata.
- February–April housing totaled EUR 9,259.61; mortgage EUR 6,223.65. The full-run Spanish answer incorrectly called mortgage the most frequent description: it has three entries versus six fuel entries. Both targeted answers now correctly describe highest cumulative spending.
- Trend answers matched the Costco golden, EUR 219.38 in May to EUR 338.96 in November, and explicitly disclosed only three observed months rather than claiming steady monthly growth.
- Personal phone answers reported the USD 580.55 device replacement and no recorded personal service bills, excluding the other member's USD 768.18 phone plan.
- Semantic supporting totals checked out: maintenance USD 950.77 = oil 309.87 + tires 640.90; equipment repairs USD 671.61 = washer 387.05 + heater parts 284.56. Housing USD 37,205.40 became USD 37,628.64 only when explicitly including additional improvement/heater spending outside that category.

Minor prose caveats remain: some privacy refusals offer shared-expense help despite the no-follow-up instruction. One says it can “only access shared household records,” understating access to the current user's personal records. Its refusal was safe and made no SQL calls.

## Reproducibility

Exact prompts are saved as `prompt-<sha256>.txt` and passed into the agent. The model-configuration SHA-256 is `cc8d6ae5dd15631d273d0463c77c236a3001847447c533b0e8cd9f69387e9426`.

| Run / currency | Prompt SHA-256 |
| --- | --- |
| Final golden / COP | `f26cd3e9104000418c8ea0cfe8e3abe4b6b7f883d95dafcf34375f859e108810` |
| Final golden and semantic / USD | `f9f92bc08ded6f9e3febb760cd6020586fdab3826ea6939e0cb5e2ea8040330b` |
| Final golden / EUR | `1b85d72071cf8ca7b1a3283b003037bd26502a6a7cd85f63a87ab20bce73819a` |
| Targeted wording rerun / EUR | `fd907390b9776ab9d3d058c024e9254e65c28d9a52780e9858b44db874de8d46` |

The last wording clarification received the targeted two-case rerun, not another full sweep. `reassess.ts` rescans archived traces without model calls. Scorer corrections recognize SQL results already expressed in major currency units and curly-apostrophe refusals; they do not change goldens.

## Refinement and limits

The first full run (`2026-11-09T20-16-28.976Z`) matched 22/26 primary values but had incorrect supporting COP figures, a wrong-language answer and internal IDs. The next full run (`2026-11-09T20-19-40.046Z`) matched 24/26 primary values but exposed scope/date ambiguities. Targeted evaluation caught merchant-first grouping losing a payment. Explicit scope/date rules, SQL money formatting and note-first grouping corrected those observed issues.

The previous semantic run (`2026-11-09T20-21-27.602Z`) answered all 12 correctly but needed 64 queries and 12 oversized-result retries, median 16.38 seconds. Compact projections reduced the final run to 31 queries, zero errors and median 9.06 seconds. These individual runs are not a controlled latency benchmark.

These evaluations exercise the production loop and SQLite worker with local synthetic snapshots, not deployed Supabase authentication/RLS or browser streaming. They do not establish large-history performance or repeated-run reliability. Golden fixtures contain only one shared household; dedicated loader/SQLite tests cover private/cross-household isolation separately. Fresh unseen cases and repeated runs are needed to measure generalization. Mechanical passes cannot prove every sentence correct, as the frequency wording demonstrates.

## Apple/tag coverage follow-up

The user's Apple-spending report exposed a gap in the previous evaluations:
fixture tags had been generated from notes, so those results did not establish
that the assistant would find an expense whose only brand evidence was in tags.

New synthetic cases use the unchanged production SQL worker and GPT-6 Luna at
medium reasoning. Each asks about Apple spending in English and Spanish:

- Brand appears only in tags on an otherwise generic charge; multiple matching
  tags must count as one expense.
- Brand appears in the note, without tags.
- Mixed evidence across tags, merchant, Apple Music and iCloud descriptions,
  plus unrelated subscriptions and grocery apples to exclude.

The initial prompt passed only **3/6** cases
(`apple-tags-2026-11-09T20-36-34.690Z`). The Spanish tags-only answer reported no
matching Apple descriptions without querying tags. Both mixed cases understated
the total. This reproduces the reported *class* of failure; it does not establish
what happened to the user's actual saved entry.

Making tag searches mandatory fixed the tags-only cases, but the first revision
still missed iCloud in both mixed cases (**4/6**,
`apple-tags-2026-11-09T20-37-42.408Z`). The final prompt also requires discovering
related product/service names before totaling brand spending.

The final run passed **6/6** (`apple-tags-2026-11-09T20-38-58.249Z`). Both languages
returned USD 12.99 for the tags-only charge and USD 51.96 for the four Apple
charges, including iCloud and excluding grocery apples. Traces contain the exact
prompt/hash and SQL evidence for those totals; tag predicates use EXISTS rather
than multiplying rows by matching tags. The dedicated SQL regression and all 36
worker tests pass; typecheck and focused formatting checks pass.

These are targeted results after a further prompt change. The earlier 26-case
and 12-case sweeps predate this follow-up and were not rerun here. Changes remain
local; no deployment or live-user-data inspection occurred.

## Typed-input and household-shape follow-up

The primary suite is now `pnpm agent:eval`, backed by the synthetic household
fixture described in [HOUSEHOLD-FINDINGS.md](HOUSEHOLD-FINDINGS.md). The earlier
26-case suite remains unchanged under `pnpm agent:eval:legacy`.

The assistant now prioritizes the relational `expense_tags` view for activity,
place, person and other user-defined groupings. The snapshot supplements saved
tags with the production extractor's output from the note, repairing legacy
missing/incomplete tags locally. It also projects null categories as
`uncategorized`. Neither change writes to stored expenses.

Parser-backed typing cases passed **20/20** across both languages and scopes
(`typed-tags-2026-11-09T20-45-05.628Z`). With all merchants null, the three lunch
entries total115/3, Crepes25/1, and place groups25/30/60. A separate dinner at
Crepes raises that place's total to60/2 without changing lunch115/3. The exact
values are COP units as parsed, not an implicit thousand multiplier.

Changes to prioritize tags also required rechecking the prior Apple cases.
Intermediate revisions exposed two real omissions (a merchant-only record and
iCloud) and a broad note-OR predicate that reintroduced grocery apples after
semantic exclusion. One earlier mechanical failure was only the tag-use check
not recognizing the new `expense_tags` view; that check was corrected. The final
prompt requires broad compact vocabulary discovery for brand ecosystems, exact
accepted tag/merchant values or IDs for aggregation, and preservation of any
semantic exclusions. It retains populated merchants as a completeness backstop,
never as required metadata.

The latest Apple run passed **6/6**, with SQL evidence and final figures reviewed:
`apple-tags-2026-11-09T21-02-07.759Z`. It includes the tag-only charge, iCloud and
the populated merchant-only purchase, counts each once, and excludes grocery
apples. These targeted brand refinements followed the representative-household
run; each trace archives its actual prompt version rather than implying one
unchanging prompt throughout the work.

Final code checks:480 tests across66 suites passed, lint/data boundaries and
formatting passed with two existing hook warnings, and production build plus
compiled-worker smoke passed. Actual household data was read only to derive
aggregate shape statistics; temporary raw records/tag names were removed after
profiling. No real records were copied into fixtures or sent to evaluation
models. No database writes or deployment were performed.
