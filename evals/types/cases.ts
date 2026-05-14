import type { SupportedCurrency } from '@lib-types/user-preferences';

/** Difficulty band used to bucket cases on the Braintrust dashboard. */
export type Difficulty = 'simple' | 'medium' | 'hard';

/** Topical bucket for filtering and dashboard slicing. */
export type Category =
  | 'time_aggregation'
  | 'recurrence'
  | 'category_breakdown'
  | 'savings_rate'
  | 'frequency'
  | 'filtered_total'
  | 'trend'
  | 'household_scope'
  | 'privacy_safety';

/** Whether the case can be answered directly from a single tool call. */
export type Answerability = 'direct' | 'indirect_hard';

/**
 * Scope the agent should operate under. `forbidden_other_person_personal`
 * marks privacy-test cases where the agent must refuse to act.
 */
export type EvalScope =
  | 'personal'
  | 'household'
  | 'forbidden_other_person_personal';

/** The three frozen fixture JSONs that back the eval suite. */
export type EvalFixture =
  | 'expenses.cop.golden.json'
  | 'expenses.eur.golden.json'
  | 'expenses.usd.golden.json';

/**
 * The discriminated union of every shape an eval's `expected` payload can take.
 *
 * Each variant corresponds to one scorer in `evals/scoring/scorers.ts` —
 * `scoreTopGroup`, `scoreSavingsRate`, etc.
 */
export type ExpectedValue =
  | {
      kind: 'top_group';
      scope?: 'personal' | 'household';
      dimension: 'month' | 'category' | 'user';
      label: string;
      startDate?: string;
      endDate?: string;
      amountCents: number;
      transactionCount: number;
      currency: SupportedCurrency;
    }
  | {
      kind: 'recurring_expense';
      scope?: 'personal' | 'household';
      label: string;
      category: string;
      totalExpenseCents: number;
      averageAmountCents?: number;
      transactionCount: number;
      cadence?: 'monthly';
      currency: SupportedCurrency;
    }
  | {
      kind: 'savings_rate';
      startDate?: string;
      endDate?: string;
      incomeCents: number;
      totalExpenseCents: number;
      netCents: number;
      savingsRate: number;
      savingsPercentage: number;
      currency: SupportedCurrency;
    }
  | {
      kind: 'frequency';
      label: string;
      transactionCount: number;
      totalExpenseCents: number;
      currency: SupportedCurrency;
    }
  | {
      kind: 'filtered_total';
      label: string;
      category: string;
      tags?: string[];
      startDate: string;
      endDate: string;
      totalExpenseCents: number;
      transactionCount: number;
      currency: SupportedCurrency;
    }
  | {
      kind: 'increasing_expense';
      label: string;
      category: string;
      firstMonth: string;
      firstAmountCents: number;
      lastMonth: string;
      lastAmountCents: number;
      deltaCents: number;
      slopeCentsPerMonth: number;
      currency: SupportedCurrency;
    }
  | {
      kind: 'privacy_refusal';
      reasonCode: 'other_person_personal_expenses';
    };

/**
 * One curated eval case, with the input prompt, expected payload, and metadata
 * the eval setup uses to dispatch (currency → fixture, scope, anchor date).
 */
export type MomoAgentEvalCase = {
  id: string;
  input: string;
  locale: 'en' | 'es';
  pairId: string;
  category: Category;
  difficulty: Difficulty;
  expectedTools: string[];
  expected: ExpectedValue;
  metadata: {
    answerability: Answerability;
    currency: SupportedCurrency;
    fixture: EvalFixture;
    fixtureEndDate?: '2026-04-24';
    scope: EvalScope;
    dimension?: 'category' | 'note' | 'tag' | 'user';
    rangePreset?: string;
    safetyPolicy?: 'no_other_person_personal_expenses';
  };
};
