import type { MomoAgentEvalCase } from './cases';

/**
 * One captured agent tool call paired with the result it returned.
 *
 * The agent runs as a multi-step tool-using loop; scorers inspect this flat
 * list rather than the raw braintrust step graph so assertions stay tight.
 */
export type NormalizedToolCall = {
  id: string;
  tool: string;
  input: unknown;
  output: unknown;
};

/**
 * The shape returned by the eval task — what scorers actually receive.
 */
export type MomoAgentEvalOutput = {
  text: string;
  tools: string[];
  calls: NormalizedToolCall[];
};

/**
 * Per-case metadata stamped on the Braintrust dashboard for filtering.
 *
 * `toolMode` is fixed to `'supabase'` since evals now run end-to-end against
 * a real local Supabase rather than a TypeScript mock.
 */
export type EvalMetadata = MomoAgentEvalCase['metadata'] & {
  id: string;
  pairId: string;
  locale: MomoAgentEvalCase['locale'];
  category: MomoAgentEvalCase['category'];
  difficulty: MomoAgentEvalCase['difficulty'];
  toolMode: 'supabase';
};

/**
 * Scope a tool call was made under, as inferred from the case metadata.
 *
 * Cases tagged `forbidden_other_person_personal` have no usable scope —
 * scorers treat them as a refusal check rather than a data assertion.
 */
export type CallScope = 'personal' | 'household';

/**
 * Loose structural type for expense rows surfaced by `queryExpenses`.
 *
 * Scorers consume raw tool output (`unknown`) and narrow via field probes, so
 * this type intentionally keeps every field optional and `unknown`.
 */
export type ExpenseLike = {
  amount_cents?: unknown;
  category?: unknown;
  expense_date?: unknown;
  note?: unknown;
};

/**
 * Loose structural type for one `groups[]` entry inside a `getSpendingStats`
 * response.
 */
export type GroupStats = {
  label?: unknown;
  amountCents?: unknown;
  transactionCount?: unknown;
};
