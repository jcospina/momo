import type { ExpenseCategory, ExpenseRecord } from '@lib-types/expenses';

export const AGENT_EXPENSE_SCOPES = ['personal', 'household'] as const;

export type AgentExpenseScope = (typeof AGENT_EXPENSE_SCOPES)[number];

export const DATE_RANGE_PRESETS = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'last_3_months',
  'this_year',
  'last_year',
  'custom',
] as const;

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export type ResolveDateRangeInput = {
  timezone: string | null;
  referenceDate: string | null;
  preset: DateRangePreset | null;
  startDate: string | null;
  endDate: string | null;
};

export type ResolveDateRangeResult = {
  timezone: string;
  now: string;
  currentDate: string;
  currentMonth: string;
  startDate: string;
  endDate: string;
  label: string;
};

export type AgentExpenseFilters = {
  scope: AgentExpenseScope;
  startDate: string | null;
  endDate: string | null;
  categories: ExpenseCategory[] | null;
  merchants: string[] | null;
  tags: string[] | null;
  includeIncome: boolean | null;
};

export type QueryExpensesInput = AgentExpenseFilters & {
  limit: number | null;
};

export type QueryExpensesResult = {
  expenses: ExpenseRecord[];
  appliedFilters: QueryExpensesInput;
  truncated: boolean;
};

export const SPENDING_STATS_GROUP_BY = [
  'month',
  'day',
  'category',
  'merchant',
  'user',
  'tag',
  'dayOfWeek',
] as const;

export type SpendingStatsGroupBy = (typeof SPENDING_STATS_GROUP_BY)[number];

export type GetSpendingStatsInput = AgentExpenseFilters & {
  groupBy: SpendingStatsGroupBy | null;
  limit: number | null;
};

export type SpendingStatsGroup = {
  label: string;
  amountCents: number;
  transactionCount: number;
  percentageOfTotal: number | null;
};

export type GetSpendingStatsResult = {
  scope: AgentExpenseScope;
  startDate: string | null;
  endDate: string | null;
  totalExpenseCents: number;
  totalIncomeCents: number;
  netCents: number;
  savingsRate: number | null;
  savingsRateBasis: 'income' | 'unavailable_zero_income';
  transactionCount: number;
  groupBy: SpendingStatsGroupBy | null;
  groups: SpendingStatsGroup[] | null;
};
