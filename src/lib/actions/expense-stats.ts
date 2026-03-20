'use server';

import {
  fetchAllMonthlyByCategoryUser,
  fetchAllMonthlyCashflowNet,
  fetchDailyTotalsByMonth,
  fetchMonthlyBoundsByCategoryUser,
  fetchMonthlyByCategoryUser,
} from '@helpers/expenses/expense-stats';
import { fetchHouseholdMembership } from '@helpers/households';
import { createSupabaseServerClient } from '@lib-supabase/server';
import type { MomoError } from '@lib-types/errors';
import type {
  MonthlyByCategoryUserRow,
  UserTotalPoint,
} from '@lib-types/expense-stats';
import { format, isValid, parse, subMonths } from 'date-fns';

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

type MonthRangeInput = {
  months?: string[];
  endMonth?: string;
  count?: number;
};

type ScopeInput = {
  scope?: ExpenseStatsScope;
  householdId?: string | null;
};

type ActionResult<T> = {
  data: T;
  errorCode?: MomoError;
};

function normalizeMonth(month: string): string | null {
  const parsed = parse(month, 'yyyy-MM', new Date());
  if (!isValid(parsed)) return null;
  return format(parsed, 'yyyy-MM');
}

function uniqueMonths(months: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  months.forEach(month => {
    if (!seen.has(month)) {
      seen.add(month);
      result.push(month);
    }
  });
  return result;
}

function buildMonthRange({
  months,
  endMonth,
  count,
}: MonthRangeInput): string[] {
  if (months && months.length > 0) {
    const normalized = months
      .map(month => normalizeMonth(month))
      .filter((month): month is string => Boolean(month));
    return uniqueMonths(normalized);
  }

  const normalizedEnd =
    (endMonth && normalizeMonth(endMonth)) ?? format(new Date(), 'yyyy-MM');
  const parsedEnd = normalizeMonth(normalizedEnd);
  if (!parsedEnd) return [];

  const total = Math.max(1, Math.floor(count ?? 1));
  const endDate = parse(parsedEnd, 'yyyy-MM', new Date());
  if (!isValid(endDate)) return [];

  return Array.from({ length: total }, (_, index) => {
    const offset = total - 1 - index;
    return format(subMonths(endDate, offset), 'yyyy-MM');
  });
}

function buildMonthSpan(start: string, end: string): string[] {
  const startDate = parse(start, 'yyyy-MM', new Date());
  const endDate = parse(end, 'yyyy-MM', new Date());
  if (!isValid(startDate) || !isValid(endDate) || startDate > endDate) {
    return [];
  }
  const months: string[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while (cursor <= endCursor) {
    months.push(format(cursor, 'yyyy-MM'));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

async function resolveScope({
  scope = 'auto',
  householdId,
  userId,
  supabase,
}: ScopeInput & {
  userId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  if (scope === 'personal') {
    return { householdId: null };
  }

  if (scope === 'household') {
    if (householdId) {
      return { householdId };
    }

    const membership = await fetchHouseholdMembership(supabase, userId);
    if (!membership) {
      return { householdId: null, errorCode: 'no_household' as MomoError };
    }
    return { householdId: membership.household_id };
  }

  if (householdId) {
    return { householdId };
  }

  const membership = await fetchHouseholdMembership(supabase, userId);
  return { householdId: membership?.household_id ?? null };
}

function normalizeCategory(category: string | null) {
  const trimmed = category?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'uncategorized';
}

function buildMonthlyCategoryTotals(
  months: string[],
  rows: Array<{ month: string; category: string | null; total_cents: number }>,
): MonthlyCategoryTotals[] {
  const monthMap = new Map<string, Map<string, number>>();
  rows.forEach(row => {
    const monthEntry = monthMap.get(row.month) ?? new Map<string, number>();
    const category = normalizeCategory(row.category);
    monthEntry.set(
      category,
      (monthEntry.get(category) ?? 0) + (row.total_cents ?? 0),
    );
    monthMap.set(row.month, monthEntry);
  });

  return months.map(month => {
    const categories = Array.from(monthMap.get(month)?.entries() ?? []).map(
      ([category, totalCents]) => ({
        category,
        totalCents,
      }),
    );
    return { month, categories };
  });
}

function buildDailyPoints(
  rows: Array<{
    day: number;
    total_cents: number;
    cumulative_cents: number | null;
  }>,
): DailyPoint[] {
  return [...rows]
    .sort((left, right) => left.day - right.day)
    .map(row => ({
      day: row.day,
      totalCents: row.cumulative_cents ?? row.total_cents ?? 0,
    }));
}

function toCents(value: number | string | null | undefined): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildMonthlyCashflowPoints(
  months: string[],
  rows: Array<{
    month: string;
    income_cents: number;
    expense_cents: number;
    net_cents: number;
  }>,
): MonthlyCashflowPoint[] {
  const monthMap = new Map<string, MonthlyCashflowPoint>();

  rows.forEach(row => {
    const existing = monthMap.get(row.month) ?? {
      month: row.month,
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
    };

    existing.incomeCents += toCents(row.income_cents);
    existing.expenseCents += toCents(row.expense_cents);
    existing.netCents += toCents(row.net_cents);
    monthMap.set(row.month, existing);
  });

  return months.map(month => {
    const monthData = monthMap.get(month);
    if (monthData) {
      return monthData;
    }

    return {
      month,
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
    };
  });
}

function buildCumulativeSavingsPoints(
  monthlyPoints: MonthlyCashflowPoint[],
): CumulativeSavingsPoint[] {
  let runningTotal = 0;
  return monthlyPoints.map(point => {
    runningTotal += point.netCents;
    return {
      month: point.month,
      netCents: point.netCents,
      cumulativeCents: runningTotal,
    };
  });
}

async function getMonthlyCashflowHistory({
  scope,
  householdId,
}: ScopeInput): Promise<ActionResult<{ months: MonthlyCashflowPoint[] }>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: { months: [] }, errorCode: 'auth_required' };
  }

  const resolved = await resolveScope({
    scope,
    householdId,
    userId: user.id,
    supabase,
  });
  if ('errorCode' in resolved && resolved.errorCode) {
    return { data: { months: [] }, errorCode: resolved.errorCode };
  }

  const rows = await fetchAllMonthlyCashflowNet({
    supabase,
    householdId: resolved.householdId,
  });

  const monthsFromRows = rows
    .map(row => row.month)
    .filter((month): month is string => Boolean(month));
  const unique = uniqueMonths(monthsFromRows);
  if (!unique.length) {
    return { data: { months: [] } };
  }

  const earliest = unique[0];
  const currentMonth = format(new Date(), 'yyyy-MM');
  const latest =
    currentMonth > unique[unique.length - 1]
      ? currentMonth
      : unique[unique.length - 1];
  const months = buildMonthSpan(earliest, latest);
  const points = buildMonthlyCashflowPoints(months, rows);

  return { data: { months: points } };
}

export async function getRingChartData({
  month,
  scope,
  householdId,
}: { month?: string } & ScopeInput): Promise<
  ActionResult<{ month: string; items: CategoryTotal[] }>
> {
  const targetMonth = normalizeMonth(month ?? format(new Date(), 'yyyy-MM'));
  if (!targetMonth) {
    return { data: { month: month ?? '', items: [] } };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: { month: targetMonth, items: [] },
      errorCode: 'auth_required',
    };
  }

  const resolved = await resolveScope({
    scope,
    householdId,
    userId: user.id,
    supabase,
  });
  if ('errorCode' in resolved && resolved.errorCode) {
    return {
      data: { month: targetMonth, items: [] },
      errorCode: resolved.errorCode,
    };
  }

  const rows = await fetchMonthlyByCategoryUser({
    supabase,
    householdId: resolved.householdId,
    months: [targetMonth],
  });

  const categoryTotals = new Map<string, number>();
  rows.forEach(row => {
    const category = normalizeCategory(row.category);
    categoryTotals.set(
      category,
      (categoryTotals.get(category) ?? 0) + (row.total_cents ?? 0),
    );
  });

  const items = Array.from(categoryTotals.entries()).map(
    ([category, totalCents]) => ({
      category,
      totalCents,
    }),
  );
  return { data: { month: targetMonth, items } };
}

export async function getMonthlyCategoryRange({
  scope,
  householdId,
  months,
  endMonth,
  count,
}: ScopeInput & MonthRangeInput): Promise<
  ActionResult<{ months: MonthlyCategoryTotals[] }>
> {
  const range = buildMonthRange({ months, endMonth, count });
  if (!range.length) {
    return { data: { months: [] } };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: { months: [] }, errorCode: 'auth_required' };
  }

  const resolved = await resolveScope({
    scope,
    householdId,
    userId: user.id,
    supabase,
  });
  if ('errorCode' in resolved && resolved.errorCode) {
    return { data: { months: [] }, errorCode: resolved.errorCode };
  }

  const rows = await fetchMonthlyByCategoryUser({
    supabase,
    householdId: resolved.householdId,
    months: range,
  });

  const categoryRows = rows.map(row => ({
    month: row.month,
    category: row.category,
    total_cents: row.total_cents,
  }));

  const result = buildMonthlyCategoryTotals(range, categoryRows);
  return { data: { months: result } };
}

export async function getMonthlyCategoryUserRange({
  scope,
  householdId,
  months,
  endMonth,
  count,
}: ScopeInput & MonthRangeInput): Promise<
  ActionResult<{ months: string[]; rows: MonthlyByCategoryUserRow[] }>
> {
  const range = buildMonthRange({ months, endMonth, count });
  if (!range.length) {
    return { data: { months: [], rows: [] } };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: { months: [], rows: [] }, errorCode: 'auth_required' };
  }

  const resolved = await resolveScope({
    scope,
    householdId,
    userId: user.id,
    supabase,
  });
  if ('errorCode' in resolved && resolved.errorCode) {
    return { data: { months: [], rows: [] }, errorCode: resolved.errorCode };
  }

  const rows = await fetchMonthlyByCategoryUser({
    supabase,
    householdId: resolved.householdId,
    months: range,
  });

  return { data: { months: range, rows } };
}

export async function getMonthlyWindow({
  scope,
  householdId,
  endMonth,
}: ScopeInput & { endMonth?: string }): Promise<
  ActionResult<{ months: string[]; rows: MonthlyByCategoryUserRow[] }>
> {
  const range = buildMonthRange({ endMonth, count: 12 });
  if (!range.length) {
    return { data: { months: [], rows: [] } };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: { months: [], rows: [] }, errorCode: 'auth_required' };
  }

  const resolved = await resolveScope({
    scope,
    householdId,
    userId: user.id,
    supabase,
  });
  if ('errorCode' in resolved && resolved.errorCode) {
    return { data: { months: [], rows: [] }, errorCode: resolved.errorCode };
  }

  const rows = await fetchMonthlyByCategoryUser({
    supabase,
    householdId: resolved.householdId,
    months: range,
  });

  return { data: { months: range, rows } };
}

export async function getMonthlyHistory({
  scope,
  householdId,
}: ScopeInput): Promise<
  ActionResult<{ months: string[]; rows: MonthlyByCategoryUserRow[] }>
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: { months: [], rows: [] }, errorCode: 'auth_required' };
  }

  const resolved = await resolveScope({
    scope,
    householdId,
    userId: user.id,
    supabase,
  });
  if ('errorCode' in resolved && resolved.errorCode) {
    return { data: { months: [], rows: [] }, errorCode: resolved.errorCode };
  }

  const rows = await fetchAllMonthlyByCategoryUser({
    supabase,
    householdId: resolved.householdId,
  });

  const monthsFromRows = rows
    .map(row => row.month)
    .filter((month): month is string => Boolean(month));
  const unique = uniqueMonths(monthsFromRows);
  if (!unique.length) {
    return { data: { months: [], rows } };
  }

  const earliest = unique[0];
  const currentMonth = format(new Date(), 'yyyy-MM');
  const latest =
    currentMonth > unique[unique.length - 1]
      ? currentMonth
      : unique[unique.length - 1];
  const months = buildMonthSpan(earliest, latest);

  return { data: { months, rows } };
}

export async function getMonthlyDataBounds({
  scope,
  householdId,
}: ScopeInput): Promise<
  ActionResult<{ earliestMonth: string | null; currentMonth: string }>
> {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: { earliestMonth: null, currentMonth },
      errorCode: 'auth_required',
    };
  }

  const resolved = await resolveScope({
    scope,
    householdId,
    userId: user.id,
    supabase,
  });
  if ('errorCode' in resolved && resolved.errorCode) {
    return {
      data: { earliestMonth: null, currentMonth },
      errorCode: resolved.errorCode,
    };
  }

  const bounds = await fetchMonthlyBoundsByCategoryUser({
    supabase,
    householdId: resolved.householdId,
  });

  return {
    data: {
      earliestMonth: bounds.earliestMonth,
      currentMonth,
    },
  };
}

export async function getMonthlyTotalsRange({
  scope,
  householdId,
  months,
  endMonth,
  count,
}: ScopeInput & MonthRangeInput): Promise<
  ActionResult<{ months: Array<{ month: string; totalCents: number }> }>
> {
  const range = buildMonthRange({ months, endMonth, count });
  if (!range.length) {
    return { data: { months: [] } };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: { months: [] }, errorCode: 'auth_required' };
  }

  const resolved = await resolveScope({
    scope,
    householdId,
    userId: user.id,
    supabase,
  });
  if ('errorCode' in resolved && resolved.errorCode) {
    return { data: { months: [] }, errorCode: resolved.errorCode };
  }

  const rows = await fetchMonthlyByCategoryUser({
    supabase,
    householdId: resolved.householdId,
    months: range,
  });

  const totalsMap = new Map<string, number>();
  rows.forEach(row => {
    totalsMap.set(row.month, (totalsMap.get(row.month) ?? 0) + row.total_cents);
  });

  const monthsResult = range.map(month => ({
    month,
    totalCents: totalsMap.get(month) ?? 0,
  }));

  return { data: { months: monthsResult } };
}

export async function getDailyComparisonData({
  scope,
  householdId,
  currentMonth,
  previousMonth,
}: ScopeInput & {
  currentMonth?: string;
  previousMonth?: string;
}): Promise<
  ActionResult<{
    currentMonth: string;
    previousMonth: string;
    current: DailyPoint[];
    previous: DailyPoint[];
  }>
> {
  const normalizedCurrent =
    normalizeMonth(currentMonth ?? format(new Date(), 'yyyy-MM')) ??
    format(new Date(), 'yyyy-MM');
  const currentDate = parse(normalizedCurrent, 'yyyy-MM', new Date());
  const normalizedPrevious =
    normalizeMonth(
      previousMonth ?? format(subMonths(currentDate, 1), 'yyyy-MM'),
    ) ?? format(subMonths(currentDate, 1), 'yyyy-MM');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: {
        currentMonth: normalizedCurrent,
        previousMonth: normalizedPrevious,
        current: [],
        previous: [],
      },
      errorCode: 'auth_required',
    };
  }

  const resolved = await resolveScope({
    scope,
    householdId,
    userId: user.id,
    supabase,
  });
  if ('errorCode' in resolved && resolved.errorCode) {
    return {
      data: {
        currentMonth: normalizedCurrent,
        previousMonth: normalizedPrevious,
        current: [],
        previous: [],
      },
      errorCode: resolved.errorCode,
    };
  }

  const rows = await fetchDailyTotalsByMonth({
    supabase,
    householdId: resolved.householdId,
    months: [normalizedCurrent, normalizedPrevious],
  });

  const currentRows = rows.filter(row => row.month === normalizedCurrent);
  const previousRows = rows.filter(row => row.month === normalizedPrevious);

  return {
    data: {
      currentMonth: normalizedCurrent,
      previousMonth: normalizedPrevious,
      current: buildDailyPoints(currentRows),
      previous: buildDailyPoints(previousRows),
    },
  };
}

export async function getMonthlyIncomeVsExpenseData({
  scope,
  householdId,
}: ScopeInput): Promise<ActionResult<{ months: MonthlyCashflowPoint[] }>> {
  return getMonthlyCashflowHistory({ scope, householdId });
}

export async function getCumulativeSavingsData({
  scope,
  householdId,
}: ScopeInput): Promise<ActionResult<{ months: CumulativeSavingsPoint[] }>> {
  const history = await getMonthlyCashflowHistory({ scope, householdId });
  if (history.errorCode) {
    return { data: { months: [] }, errorCode: history.errorCode };
  }

  return {
    data: {
      months: buildCumulativeSavingsPoints(history.data.months),
    },
  };
}

export async function getUserTotalsForMonth({
  month,
  scope,
  householdId,
}: { month?: string } & ScopeInput): Promise<
  ActionResult<{ month: string; items: UserTotalPoint[] }>
> {
  const targetMonth = normalizeMonth(month ?? format(new Date(), 'yyyy-MM'));
  if (!targetMonth) {
    return { data: { month: month ?? '', items: [] } };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: { month: targetMonth, items: [] },
      errorCode: 'auth_required',
    };
  }

  const resolved = await resolveScope({
    scope,
    householdId,
    userId: user.id,
    supabase,
  });
  if ('errorCode' in resolved && resolved.errorCode) {
    return {
      data: { month: targetMonth, items: [] },
      errorCode: resolved.errorCode,
    };
  }

  const rows = await fetchMonthlyByCategoryUser({
    supabase,
    householdId: resolved.householdId,
    months: [targetMonth],
  });

  const userTotals = new Map<string, number>();
  rows.forEach(row => {
    const label = row.user_label ?? 'Unknown';
    userTotals.set(label, (userTotals.get(label) ?? 0) + row.total_cents);
  });

  const items = Array.from(userTotals.entries())
    .map(([user_label, totalCents]) => ({ user_label, totalCents }))
    .filter(item => item.totalCents > 0);

  return { data: { month: targetMonth, items } };
}

export async function getMonthlyCategoryUserBreakdown({
  month,
  scope,
  householdId,
}: { month?: string } & ScopeInput): Promise<
  ActionResult<{ month: string; rows: MonthlyByCategoryUserRow[] }>
> {
  const targetMonth = normalizeMonth(month ?? format(new Date(), 'yyyy-MM'));
  if (!targetMonth) {
    return { data: { month: month ?? '', rows: [] } };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: { month: targetMonth, rows: [] },
      errorCode: 'auth_required',
    };
  }

  const resolved = await resolveScope({
    scope,
    householdId,
    userId: user.id,
    supabase,
  });
  if ('errorCode' in resolved && resolved.errorCode) {
    return {
      data: { month: targetMonth, rows: [] },
      errorCode: resolved.errorCode,
    };
  }

  const rows = await fetchMonthlyByCategoryUser({
    supabase,
    householdId: resolved.householdId,
    months: [targetMonth],
  });

  return { data: { month: targetMonth, rows } };
}
