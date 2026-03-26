import type { MomoError } from '@lib-types/errors';
import type {
  MonthlyByCategoryUserRow,
  UserTotalPoint,
} from '@lib-types/expense-stats';

export type ExpenseStatsScope = 'auto' | 'household' | 'personal';

export type CategoryTotal = {
  category: string;
  totalCents: number;
};

export type MonthlyCategoryTotals = {
  month: string;
  categories: CategoryTotal[];
};

export type DailyPoint = {
  day: number;
  totalCents: number;
};

export type MonthlyCashflowPoint = {
  month: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

export type CumulativeSavingsPoint = {
  month: string;
  netCents: number;
  cumulativeCents: number;
};

export type MonthRangeInput = {
  months?: string[];
  endMonth?: string;
  count?: number;
};

export type ScopeInput = {
  scope?: ExpenseStatsScope;
  householdId?: string | null;
};

export type ActionResult<T> = {
  data: T;
  errorCode?: MomoError;
};

export type UserTotalsResult = ActionResult<{
  month: string;
  items: UserTotalPoint[];
}>;

export type MonthlyRowsResult = ActionResult<{
  months: string[];
  rows: MonthlyByCategoryUserRow[];
}>;
