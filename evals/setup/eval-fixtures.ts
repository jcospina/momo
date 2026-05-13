import type { EvalFixtureTriple } from '@evals/types/setup';

export type { EvalFixtureTriple } from '@evals/types/setup';

export const EVAL_FIXTURE_TRIPLES: readonly EvalFixtureTriple[] = [
  {
    currency: 'COP',
    ownerEmail: 'eval-owner-cop@momo.local',
    ownerDisplayName: 'Eval Owner COP',
    memberEmail: 'eval-member-cop@momo.local',
    memberDisplayName: 'Eval Member COP',
    householdName: 'Eval Household COP',
    fixturePath: 'evals/mocks/dataset/expenses.cop.golden.json',
  },
  {
    currency: 'EUR',
    ownerEmail: 'eval-owner-eur@momo.local',
    ownerDisplayName: 'Eval Owner EUR',
    memberEmail: 'eval-member-eur@momo.local',
    memberDisplayName: 'Eval Member EUR',
    householdName: 'Eval Household EUR',
    fixturePath: 'evals/mocks/dataset/expenses.eur.golden.json',
  },
  {
    currency: 'USD',
    ownerEmail: 'eval-owner-usd@momo.local',
    ownerDisplayName: 'Eval Owner USD',
    memberEmail: 'eval-member-usd@momo.local',
    memberDisplayName: 'Eval Member USD',
    householdName: 'Eval Household USD',
    fixturePath: 'evals/mocks/dataset/expenses.usd.golden.json',
  },
];

export const DEFAULT_EVAL_PASSWORD = 'eval-dev-password';

export function getEvalPassword(): string {
  return process.env.MOMO_EVAL_PASSWORD ?? DEFAULT_EVAL_PASSWORD;
}
