import type { ExpenseRecord } from '@lib-types/expenses';

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
  timezone?: string;
  referenceDate?: string;
  preset?: DateRangePreset;
  startDate?: string;
  endDate?: string;
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

export type GetExpensesInput = {
  scope: AgentExpenseScope;
  startDate?: string;
  endDate?: string;
  limit?: number;
  categories?: string[];
  merchants?: string[];
  includeIncome?: boolean;
};

export type GetExpensesResult = {
  expenses: ExpenseRecord[];
  appliedFilters: GetExpensesInput;
};

export const SPENDING_SUMMARY_GROUP_BY = [
  'month',
  'category',
  'merchant',
  'day',
  'user',
] as const;

export type SpendingSummaryGroupBy = (typeof SPENDING_SUMMARY_GROUP_BY)[number];

export type GetSpendingSummaryInput = {
  scope: AgentExpenseScope;
  startDate: string;
  endDate: string;
  groupBy?: SpendingSummaryGroupBy;
  limit?: number;
  includeIncome?: boolean;
};

export type SpendingSummaryGroup = {
  label: string;
  amountCents: number;
  percentageOfTotal: number | null;
  transactionCount: number | null;
};

export type GetSpendingSummaryResult = {
  scope: AgentExpenseScope;
  startDate: string;
  endDate: string;
  totalExpenseCents: number;
  transactionCount: number;
  groupBy: SpendingSummaryGroupBy;
  groups: SpendingSummaryGroup[];
};

export type GetCashflowSummaryInput = {
  scope: AgentExpenseScope;
  startDate: string;
  endDate: string;
};

export type GetCashflowSummaryResult = {
  scope: AgentExpenseScope;
  startDate: string;
  endDate: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  savingsRate: number | null;
  savingsRateBasis: 'income' | 'unavailable_zero_income';
};

export const SPENDING_COMPARISON_BREAKDOWN_BY = [
  'category',
  'merchant',
  'month',
  'user',
] as const;

export type SpendingComparisonBreakdownBy =
  (typeof SPENDING_COMPARISON_BREAKDOWN_BY)[number];

export type CompareSpendingPeriodsInput = {
  scope: AgentExpenseScope;
  currentStartDate: string;
  currentEndDate: string;
  previousStartDate: string;
  previousEndDate: string;
  breakdownBy?: SpendingComparisonBreakdownBy;
  limit?: number;
};

export type SpendingComparisonDriver = {
  label: string;
  currentAmountCents: number;
  previousAmountCents: number;
  deltaCents: number;
  deltaPercentage: number | null;
  direction: 'increase' | 'decrease' | 'flat';
};

export type CompareSpendingPeriodsResult = {
  scope: AgentExpenseScope;
  currentStartDate: string;
  currentEndDate: string;
  previousStartDate: string;
  previousEndDate: string;
  currentTotalCents: number;
  previousTotalCents: number;
  deltaCents: number;
  deltaPercentage: number | null;
  breakdownBy: SpendingComparisonBreakdownBy;
  drivers: SpendingComparisonDriver[];
};

export type FindRecurringExpenseCandidatesInput = {
  scope: AgentExpenseScope;
  startDate?: string;
  endDate?: string;
  minOccurrences?: number;
  maxCandidates?: number;
};

export type RecurringExpenseCandidate = {
  label: string;
  merchant: string | null;
  category: string | null;
  occurrenceCount: number;
  monthsSeen: string[];
  averageAmountCents: number;
  minAmountCents: number;
  maxAmountCents: number;
  lastSeenAt: string;
  confidence: number;
};

export type FindRecurringExpenseCandidatesResult = {
  scope: AgentExpenseScope;
  startDate: string | null;
  endDate: string | null;
  candidates: RecurringExpenseCandidate[];
};
