import type { SupportedCurrency } from '@lib-types/user-preferences';

export type ParseErrorCode = 'amount_missing' | 'amount_non_positive';

export type ParsedEntry = {
  raw: string;
  normalized: string;
  amount_minor: number;
  multiplier: number;
  currency: SupportedCurrency;
  tags: string[];
  category: ExpenseCategory | null;
};

export type EntryError = {
  raw: string;
  normalized: string;
  errorCode: ParseErrorCode;
};

export type ParseResult =
  | {
      status: 'parsed';
      entries: ParsedEntry[];
      errors: EntryError[];
    }
  | {
      status: 'no_expense';
      entries: [];
      errors: EntryError[];
    };
export const EXPENSE_CATEGORIES = [
  'housing',
  'utilities',
  'groceries',
  'dining',
  'transportation',
  'vehicle',
  'health',
  'education',
  'shopping',
  'entertainment',
  'subscriptions',
  'travel',
  'gifts',
  'fees',
  'income',
  'transfer',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type ExpenseMatchStrength = 'strong' | 'weak' | 'exclude';

export type ExpenseInvertedIndexEntry = {
  category: ExpenseCategory;
  match: ExpenseMatchStrength;
};

export type ExpenseInvertedIndex = Record<string, ExpenseInvertedIndexEntry[]>;

export type ExpenseScoringConfig = {
  strong: number;
  weak: number;
  exclude: number;
  min_confidence: number;
  min_margin: number;
};

export type ExpenseScoreResult = {
  category: ExpenseCategory | null;
  tags: string[];
  scores: Record<ExpenseCategory, number>;
};
