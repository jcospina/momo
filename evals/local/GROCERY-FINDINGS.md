# Grocery average regression evaluation

Run `pnpm exec tsx evals/local/grocery-averages.ts` with the configured model and
API key. `--reference` computes the fixture reference without model calls;
`--filter=case-id` selects one question. Traces remain local under
`.scratch/momo-grocery-evals/` and include the prompt, synthetic rows, SQL and
answers. This suite uses the production agent loop and SQLite executor, with
synthetic authorized rows in place of Supabase reads.

## Reproduced failure

The original prompt instructed tag-first matching. With 16 invented grocery
expenses totaling COP 6,000,000 over July–October (COP 1,500,000 monthly), the
original Spanish question returned COP 400,000 per transaction from only four
`mercado`-tagged records. The monthly question returned COP 600,000 monthly by
including an unrelated restaurant named “mercado central”; the explicit
July–October question returned COP 400,000 monthly. SQL inspection confirmed
category-plus-literal-tag intersections omitted other grocery entries, and the
monthly tag-only query also included the restaurant homonym.

Baseline traces: `.scratch/momo-grocery-evals/2026-11-10T00-51-46.344Z/`.
All baseline records were owned by one person; scope was personal. Before the
fixed run, the fixture was strengthened with shared records from another member
and an owner-only private COP 9,000,000 distractor. The household reference
remained COP 6,000,000 / 4 = COP 1,500,000. Thus this is a semantic baseline plus
additional scope regression coverage, not an identical-fixture A/B comparison.

## Fixed results

Each question completed with one SQL call and a nonempty final answer. SQL
outputs and answers contained the independently calculated expected amounts;
all household cases used household scope and excluded the private distractor.

| Question | Expected and observed |
| --- | --- |
| Original “promedio de gastos en mercado” | COP 1,500,000 monthly; COP 6,000,000 total |
| “promedio mensual … mercado/groceries” | COP 1,500,000 monthly |
| Explicit July–October | COP 1,500,000 monthly |
| Unseen synonym “víveres” | COP 1,500,000 monthly |
| Explicit average individual purchase | COP 375,000 over 16 purchases |
| Explicit July–November including no-purchase months | COP 1,200,000 over five months; November COP 0 |
| Explicit personal scope | COP 2,950,000 monthly; COP 11,800,000 total |

Primary fixed traces: `2026-11-10T00-53-17.766Z` (four cases),
`2026-11-10T00-53-50.152Z` (synonym), `2026-11-10T00-54-18.909Z`
(zero month), and `2026-11-10T00-54-19.992Z` (personal), under the same scratch
root. The later extra cases use canonical `dining` for the restaurant distractor.
The personal result correctly includes the owner's shared and private records,
though its wording “sin incluir el hogar” was imprecise and flagged for prompt
clarification. A rerun after a wording instruction (`2026-11-10T00-55-12.529Z`)
again returned the correct figures but said “no los del hogar”. A stronger
clarification then passed both figures and wording in
`2026-11-10T00-55-46.082Z`: “tus propios gastos, incluidos los que compartiste
en el hogar”.

Monthly answers disclosed period and denominator and supplied month-by-month
figures. These results validate synthetic behavior, not the user's actual
COP 1.5M estimate, deployed behavior, or authenticated household access. One run
per question is regression evidence, not a statistical reliability estimate.

Six existing lunch/activity regression cases also passed after the change,
including household, personal override, place intersection, overlapping tags
and monthly comparisons. Traces: `.scratch/momo-household-evals/2026-11-10T00-54-10.465Z/`.
A separate subagent roleplay using the real SQLite tool found that literal
grocery tags captured roughly half of the grocery category total on the legacy
fixture; its prompt/SQL/answer evidence is in `.scratch/momo-grocery-roleplay/`.
That roleplay supplements the production-model checks above.
