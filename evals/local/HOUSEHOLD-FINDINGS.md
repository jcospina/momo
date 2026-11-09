# Representative household evaluation

The revised suite passed **12/12 cases**, including independent review of every final answer's figures, counts, scopes and missing-income behavior. It uses **synthetic data**, shaped by aggregate characteristics of the sole active household. No real expense records, amounts, notes, private names or identifiers were copied into it. Its financial totals describe only the synthetic fixture.

## Fixture and reference checks

Regenerate with `pnpm exec tsx evals/local/generate-household.ts`. Run the assistant with `pnpm exec tsx evals/local/household.ts`; `--reference` prints independently derived reference values without calling a model. Each run archives the exact synthetic fixture, prompt, model settings, hashes, SQL results and final answers under ignored `.scratch/momo-household-evals/`.

The 462 synthetic records match the measured aggregate targets for COP currency, date span (November 1, 2025 through November 8, 2026), category counts, 414 missing merchants, 418 notes containing amounts, 13 empty tag arrays, zero missing notes and zero income entries. The saved-tag count histogram also matches: 13 zero-tag, 235 one-tag, 168 three-tag, 40 six-tag and six nine-tag records.

Note lengths are approximate, not claimed identical:

| Words per note | Aggregate target | Synthetic |
| --- | ---: | ---: |
| 1 | 33 | 25 |
| 2 | 218 | 228 |
| 3 | 159 | 167 |
| 4 | 39 | 37 |
| 5 | 9 | 5 |
| 6 | 4 | 0 |

The generator uses the production parser for amounts and the production tag extractor. It uses explicit `k` amounts so COP values are realistic without assuming bare `25` means `25,000`. Synthetic stored category labels are prescribed to reproduce the aggregate mix; 272 differ from the parser's initial prediction. Production can apply learned category rules after initial parsing, but this fixture does not simulate or validate that classification pipeline. It is an assistant retrieval benchmark, not evidence of classifier accuracy. It also deliberately models 44 legacy notes without amounts and 13 empty saved-tag arrays.

Reference totals are calculated from synthetic note words/phrases and scope in a separate TypeScript implementation, independently of the SQL executor and tag view. Three tests verify parser/tag consistency, overlap and personal-scope totals, and SQL/reference agreement including the missing category.

The 12 questions cover activity across places, a place across activities, activity/place intersection, people across categories, a multiword person name, a pet, overlapping tag unions without double-counting, personal versus household scopes, a relative monthly total, monthly comparison, missing categories and absent income. The last two questions use natural language without suggesting the expected missing-income answer or exposing the internal category label.

## Initial findings

Baseline `2026-11-09T20-50-59.971Z` produced 10/12 mechanical matches, 34 queries, one recovered SQL ordering error and median 8.46 seconds. Independent review found:

- A real omission: the Wings-lunch intersection returned COP 146,000 / four records instead of COP 181,000 / five, skipping a COP 35,000 legacy record with no saved tags. Prompt instructions alone did not make the model perform its required fallback.
- An ambiguous test: asking for Marta Rojas led the model to include first-name-only “Marta” records. Those six invented qualifiers have now been changed to the distinct full name **Marta Diaz**, so the case fairly tests name disambiguation. The old fixture is archived with the baseline; the ambiguity is not presented as an unqualified model failure.

The initial run's final two prompts still contained extra hints. The current versions remove them and were evaluated in the revised run. Saved trace questions preserve that provenance.

## Revised run

Completed run: `.scratch/momo-household-evals/2026-11-09T20-55-05.854Z`.

- **12/12 mechanical checks and independently reviewed answers passed**, including the natural missing-income and uncategorized questions.
- **34 SQL calls**, maximum five per case; median answer duration **8.95 seconds**.
- One oversized result during Leo exploration was refused without partial data; the agent recovered using an aggregate query.
- The previously omitted Wings lunch now contributes correctly: **COP 181,000 in five records**. Snapshot-level supplementation of saved tags with tags extracted from notes makes legacy records available to ordinary tag queries without changing stored data.
- Marta Rojas correctly totals **COP 520,000 in six records**, excluding the distinct Marta Diaz entries. Household/personal lunch totals are **COP 695,000 / COP 400,000**. The overlapping lunch-or-Crepes union counts each record once: **COP 844,000 in 23 records**.
- October lunch **COP 129,000**, August **COP 74,000**, and the **COP 55,000** increase are correct. Missing-category spending includes the original null-category record: **COP 373,000 in 11 records**.
- With no income records, the model correctly says the savings percentage cannot be calculated. Its supporting all-household spending figure, **COP 102,938,000**, was independently checked against the synthetic rows.

Model: `gpt-6-luna`, medium reasoning, parallel tool calls disabled. Exact provenance:

- Fixture SHA-256: `d066aa6efe6cf36921c47ccce3bf2f612f094c8beb8c5f61f67b6d9372d03629`.
- Prompt SHA-256: `c6d1eef491e370de0006f5ddf4e28725aa0f0bbdd85a414a0c773049364d2bb2`.
- Model-configuration SHA-256: `cc8d6ae5dd15631d273d0463c77c236a3001847447c533b0e8cd9f69387e9426`.

Regenerating the fixture reproduced identical bytes. Three reference tests and TypeScript checking passed. The main legacy golden questions and expected values remain unchanged.

## Limitations

The fixtures resemble typing style and aggregate sparsity, not the household's actual financial behavior. They do not estimate actual user spending or reproduce actual relationships between amounts, dates, names and categories. Local model evaluations do not replace deployed authentication/RLS, browser-streaming or large-history checks. After feedback-driven refinement these cases are regression tests; passing them is not universal accuracy or proof on unseen questions.
