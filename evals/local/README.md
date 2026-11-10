# Local SQL assistant evaluations

The primary golden suite models MoMo's active household data shape: short typed
Spanish entries, COP, mostly-null merchants, overlapping activity/place/person
and pet tags, legacy rows with missing tags/categories, and no recorded income.
It uses 462 invented records calibrated to aggregate statistics, not copied
household transactions. See [HOUSEHOLD-FINDINGS.md](HOUSEHOLD-FINDINGS.md) for the
comparison, provenance and results.

Run from the repository root with Node 22 and the existing `OPENAI_API_KEY` in
the shell, `.env.local`, or `.env`:

```sh
pnpm agent:eval
pnpm agent:eval --filter=lunch
pnpm agent:eval --reference
pnpm agent:eval:typed
pnpm exec tsx evals/local/grocery-averages.ts
pnpm exec tsx evals/local/apple-tags.ts
```

`--reference` calculates expected answers offline, without model calls. Other
evaluation commands use the real configured OpenAI model and incur API usage.
The production route and evaluations share the default model and provider
options from `src/agent/constants.ts`; `MOMO_AGENT_MODEL` overrides the model.
No Braintrust/Laminar upload occurs and no Supabase service or reset is used.
Expected answers are never included in the answering model's input.

The primary suite covers household/personal activity totals, places, intersections,
people and pets across categories, overlapping tags without double-counting,
calendar periods, missing categories and unavailable savings rates. Its reference
calculations match synthetic note tokens independently of SQL and the tag view.
The typed-entry suite separately checks the exact lunch examples and an extra
dinner at the same place, in both languages and scopes, with all merchants null.
The Apple suite covers tag-only, note-only and mixed product/merchant evidence.

The old 26 golden questions remain unchanged as broader regression coverage.
The earlier 12 semantic cases are also retained; they are now regression cases,
not an untouched holdout:

```sh
pnpm agent:eval:legacy
pnpm agent:eval:legacy --held-out
pnpm agent:eval:legacy --filter=savings-rate-current-month
```

The historical `evals/momo-agent.eval.ts` entry point runs that legacy suite.

## Fixtures and traces

Regenerate the synthetic household fixture deterministically:

```sh
pnpm exec tsx evals/local/generate-household.ts
```

Its metadata distinguishes measured aggregate targets from generated values.
Amounts and tags use the real parser/extractor. Synthetic stored categories are
prescribed to model the historical category mix, not to claim that the bare
parser reproduces production learned rules. Word-count distributions are close
but not identical. Invented identities, amounts and entries are explicit.

Household runs save exact fixture snapshots, prompts, hashes, SQL traces,
answers and assessments under `.scratch/momo-household-evals/`. Other runs use
`.scratch/momo-sql-evals/`. Both are gitignored. Household and legacy runners
support `MOMO_EVAL_OUTPUT` for another location. Review complete answers and
supporting figures: mechanical amount/scope checks do not prove every sentence,
ranking or interpretation correct. To rescore legacy traces offline:

```sh
pnpm exec tsx evals/local/reassess.ts .scratch/momo-sql-evals/RUN_DIRECTORY
```

Equivalent-model subagents can use the legacy fixture CLI without provider calls
from the harness:

```sh
pnpm exec tsx evals/local/query.ts USD --prompt
printf '%s\n' '{"scope":"personal","sql":"SELECT format_money(SUM(amount_cents)) AS total FROM expenses WHERE category <> ?","parameters":["income"]}' | pnpm exec tsx evals/local/query.ts USD
```

Give evaluators only the prompt and questions, restrict them to the query entry
point and ten queries per question, and record SQL/results. Their surrounding
runtime differs from the production loop, so these probes supplement rather
than replace real production-loop evaluations.

The SQL snapshot exposes `expense_tags(expense_id, tag)` with deduplicated,
normalized tags. Saved tags are supplemented with tags re-extracted from the
original note, so legacy missing/incomplete tags do not silently omit expenses.
This changes only the read-only projection, never stored household data.

Dedicated tests separately cover cross-household/private-row isolation. Fixture
evaluations do not prove deployed Supabase/RLS integration or production latency.
After a production build, verify the compiled worker and its traced dependency
using synthetic data, without API/database access:

```sh
pnpm build
pnpm exec tsx evals/local/build-smoke.ts
```

[FINDINGS.md](FINDINGS.md) preserves earlier evaluation history. Its results
belong to the prompt versions recorded there, not every later prompt revision.

The grocery regression suite exercises category semantics, household chat defaults,
monthly versus transaction averages, translated synonyms, explicit empty months,
and personal scope overrides using invented expenses and independent arithmetic.
Run with `--reference` for offline expected values or `--filter=case-id` for one
model case. Traces go to `.scratch/momo-grocery-evals/`.
