import type {
  DailyTotalsByMonthRow,
  MonthlyByCategoryUserRow,
  MonthlyCashflowNetRow,
} from '@lib-types/expense-stats';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildMonthDateBounds,
  type ExpenseRollupRow,
  normalizeCategory,
  sortMonths,
  toCents,
  toDay,
  toMonth,
} from './shared';

type PersonalRollupFetchParams = {
  supabase: SupabaseClient;
  userId: string;
  months: string[];
};

type PersonalRollupAllFetchParams = {
  supabase: SupabaseClient;
  userId: string;
};

async function fetchPersonalRollupExpenseRows({
  supabase,
  userId,
  months,
  includeIncome,
}: {
  supabase: SupabaseClient;
  userId: string;
  months?: string[];
  includeIncome: boolean;
}): Promise<ExpenseRollupRow[]> {
  let query = supabase
    .from('expenses')
    .select('expense_date, category, amount_cents')
    .eq('user_id', userId);

  if (!includeIncome) {
    query = query.neq('category', 'income');
  }

  const monthBounds = buildMonthDateBounds(months ?? []);
  if (monthBounds) {
    query = query
      .gte('expense_date', monthBounds.startDate)
      .lte('expense_date', monthBounds.endDate);
  }

  const { data, error } = await query.order('expense_date', {
    ascending: true,
  });

  if (error) {
    console.error('fetchPersonalRollupExpenseRows failed', error);
    return [];
  }

  return (data as ExpenseRollupRow[]) ?? [];
}

function buildPersonalMonthlyByCategoryRows(
  rows: ExpenseRollupRow[],
  months?: string[],
): MonthlyByCategoryUserRow[] {
  const monthFilter = months?.length ? new Set(months) : null;
  const totalsByKey = new Map<string, number>();

  rows.forEach(row => {
    const month = toMonth(row.expense_date);
    if (!month) {
      return;
    }
    if (monthFilter && !monthFilter.has(month)) {
      return;
    }

    const category = normalizeCategory(row.category);
    const key = `${month}::${category}`;
    totalsByKey.set(
      key,
      (totalsByKey.get(key) ?? 0) + toCents(row.amount_cents),
    );
  });

  return Array.from(totalsByKey.entries())
    .map(([key, total]) => {
      const [month, category] = key.split('::');
      return {
        household_id: null,
        month,
        category,
        user_label: 'Current user',
        total_cents: total,
      };
    })
    .sort((left, right) => {
      const byMonth = left.month.localeCompare(right.month);
      if (byMonth !== 0) {
        return byMonth;
      }
      return left.category.localeCompare(right.category);
    });
}

export async function fetchPersonalRollupMonthlyByCategoryUser({
  supabase,
  userId,
  months,
}: PersonalRollupFetchParams): Promise<MonthlyByCategoryUserRow[]> {
  if (!months.length) {
    return [];
  }

  const rows = await fetchPersonalRollupExpenseRows({
    supabase,
    userId,
    months,
    includeIncome: false,
  });

  return buildPersonalMonthlyByCategoryRows(rows, months);
}

export async function fetchAllPersonalRollupMonthlyByCategoryUser({
  supabase,
  userId,
}: PersonalRollupAllFetchParams): Promise<MonthlyByCategoryUserRow[]> {
  const rows = await fetchPersonalRollupExpenseRows({
    supabase,
    userId,
    includeIncome: false,
  });

  return buildPersonalMonthlyByCategoryRows(rows);
}

export async function fetchPersonalRollupDailyTotalsByMonth({
  supabase,
  userId,
  months,
}: PersonalRollupFetchParams): Promise<DailyTotalsByMonthRow[]> {
  if (!months.length) {
    return [];
  }

  const rows = await fetchPersonalRollupExpenseRows({
    supabase,
    userId,
    months,
    includeIncome: false,
  });

  const monthFilter = new Set(months);
  const dailyTotals = new Map<string, number>();

  rows.forEach(row => {
    const month = toMonth(row.expense_date);
    const day = toDay(row.expense_date);
    if (!month || day === null || !monthFilter.has(month)) {
      return;
    }

    const key = `${month}::${day}`;
    dailyTotals.set(
      key,
      (dailyTotals.get(key) ?? 0) + toCents(row.amount_cents),
    );
  });

  const totalsByMonth = new Map<
    string,
    Array<{ day: number; total: number }>
  >();
  dailyTotals.forEach((total, key) => {
    const [month, dayString] = key.split('::');
    const day = Number(dayString);
    if (!month || !Number.isInteger(day)) {
      return;
    }

    const monthEntries = totalsByMonth.get(month) ?? [];
    monthEntries.push({ day, total });
    totalsByMonth.set(month, monthEntries);
  });

  const result: DailyTotalsByMonthRow[] = [];
  sortMonths(months).forEach(month => {
    const monthEntries = totalsByMonth.get(month);
    if (!monthEntries?.length) {
      return;
    }

    let cumulative = 0;
    monthEntries
      .sort((left, right) => left.day - right.day)
      .forEach(entry => {
        cumulative += entry.total;
        result.push({
          household_id: null,
          month,
          day: entry.day,
          total_cents: entry.total,
          cumulative_cents: cumulative,
        });
      });
  });

  return result;
}

export async function fetchAllPersonalRollupMonthlyCashflowNet({
  supabase,
  userId,
}: PersonalRollupAllFetchParams): Promise<MonthlyCashflowNetRow[]> {
  const rows = await fetchPersonalRollupExpenseRows({
    supabase,
    userId,
    includeIncome: true,
  });

  const totalsByMonth = new Map<
    string,
    {
      incomeCents: number;
      expenseCents: number;
    }
  >();

  rows.forEach(row => {
    const month = toMonth(row.expense_date);
    if (!month) {
      return;
    }

    const entry = totalsByMonth.get(month) ?? {
      incomeCents: 0,
      expenseCents: 0,
    };
    const cents = toCents(row.amount_cents);
    if (row.category === 'income') {
      entry.incomeCents += cents;
    } else {
      entry.expenseCents += cents;
    }
    totalsByMonth.set(month, entry);
  });

  return Array.from(totalsByMonth.entries())
    .map(([month, totals]) => ({
      household_id: null,
      month,
      income_cents: totals.incomeCents,
      expense_cents: totals.expenseCents,
      net_cents: totals.incomeCents - totals.expenseCents,
    }))
    .sort((left, right) => left.month.localeCompare(right.month));
}

export async function fetchPersonalRollupMonthlyBoundsByCategoryUser({
  supabase,
  userId,
}: PersonalRollupAllFetchParams): Promise<{
  earliestMonth: string | null;
  latestMonth: string | null;
}> {
  const rows = await fetchPersonalRollupExpenseRows({
    supabase,
    userId,
    includeIncome: false,
  });

  const months = rows
    .map(row => toMonth(row.expense_date))
    .filter((month): month is string => Boolean(month));
  if (!months.length) {
    return { earliestMonth: null, latestMonth: null };
  }

  const sorted = sortMonths(months);
  return {
    earliestMonth: sorted[0] ?? null,
    latestMonth: sorted[sorted.length - 1] ?? null,
  };
}
