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

export type StatsActionResult<T> = {
  data: T;
  errorCode?: MomoError;
};

export type GetRingChartData = (
  input: { month?: string } & ScopeInput,
) => Promise<StatsActionResult<{ month: string; items: CategoryTotal[] }>>;

export type GetMonthlyCategoryRange = (
  input: ScopeInput & MonthRangeInput,
) => Promise<StatsActionResult<{ months: MonthlyCategoryTotals[] }>>;

export type GetMonthlyCategoryUserRange = (
  input: ScopeInput & MonthRangeInput,
) => Promise<
  StatsActionResult<{ months: string[]; rows: MonthlyByCategoryUserRow[] }>
>;

export type GetMonthlyWindow = (
  input: ScopeInput & { endMonth?: string },
) => Promise<
  StatsActionResult<{ months: string[]; rows: MonthlyByCategoryUserRow[] }>
>;

export type GetMonthlyHistory = (
  input: ScopeInput,
) => Promise<
  StatsActionResult<{ months: string[]; rows: MonthlyByCategoryUserRow[] }>
>;

export type GetMonthlyDataBounds = (
  input: ScopeInput,
) => Promise<
  StatsActionResult<{ earliestMonth: string | null; currentMonth: string }>
>;

export type GetMonthlyTotalsRange = (
  input: ScopeInput & MonthRangeInput,
) => Promise<
  StatsActionResult<{ months: Array<{ month: string; totalCents: number }> }>
>;

export type GetDailyComparisonData = (
  input: ScopeInput & {
    currentMonth?: string;
    previousMonth?: string;
  },
) => Promise<
  StatsActionResult<{
    currentMonth: string;
    previousMonth: string;
    current: DailyPoint[];
    previous: DailyPoint[];
  }>
>;

export type GetMonthlyIncomeVsExpenseData = (
  input: ScopeInput,
) => Promise<StatsActionResult<{ months: MonthlyCashflowPoint[] }>>;

export type GetCumulativeSavingsData = (
  input: ScopeInput,
) => Promise<StatsActionResult<{ months: CumulativeSavingsPoint[] }>>;

export type GetUserTotalsForMonth = (
  input: { month?: string } & ScopeInput,
) => Promise<StatsActionResult<{ month: string; items: UserTotalPoint[] }>>;

export type GetMonthlyCategoryUserBreakdown = (
  input: { month?: string } & ScopeInput,
) => Promise<
  StatsActionResult<{ month: string; rows: MonthlyByCategoryUserRow[] }>
>;
