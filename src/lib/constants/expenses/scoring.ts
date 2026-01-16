import type { ExpenseScoringConfig } from '@lib-types/expenses';

export const EXPENSE_SCORING: ExpenseScoringConfig = {
  strong: 3,
  weak: 1,
  exclude: -2,
  min_confidence: 3,
  min_margin: 2,
};

export const BIGRAM_OVERLAP_THRESHOLD = 0.3;
export const MAX_EDIT_DISTANCE = 2;
export const MIN_FUZZY_TERM_LENGTH = 3;
