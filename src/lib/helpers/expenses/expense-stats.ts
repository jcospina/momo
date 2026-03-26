import type {
  DailyTotalsByMonthRow,
  MonthlyByCategoryUserRow,
  MonthlyCashflowNetRow,
} from '@lib-types/expense-stats';
import type { SupabaseClient } from '@supabase/supabase-js';

type ViewFetchParams = {
  supabase: SupabaseClient;
  householdId: string | null;
  months: string[];
};

type BoundsFetchParams = {
  supabase: SupabaseClient;
  householdId: string | null;
};

type AllFetchParams = {
  supabase: SupabaseClient;
  householdId: string | null;
};

type PersonalRollupFetchParams = {
  supabase: SupabaseClient;
  userId: string;
  months: string[];
};

type PersonalRollupAllFetchParams = {
  supabase: SupabaseClient;
  userId: string;
};

type ExpenseRollupRow = {
  expense_date: string;
  category: string | null;
  amount_cents: number | string | null;
};

function toCents(value: number | string | null | undefined): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toMonth(expenseDate: string): string | null {
  if (!expenseDate || expenseDate.length < 7) {
    return null;
  }
  const month = expenseDate.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(month) ? month : null;
}

function toDay(expenseDate: string): number | null {
  const parts = expenseDate.split('-');
  if (parts.length !== 3) {
    return null;
  }
  const day = Number(parts[2]);
  return Number.isInteger(day) && day > 0 ? day : null;
}

function normalizeCategory(category: string | null): string {
  const trimmed = category?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'uncategorized';
}

function sortMonths(months: string[]): string[] {
  return [...months].sort((left, right) => left.localeCompare(right));
}

function buildMonthDateBounds(months: string[]): {
  startDate: string;
  endDate: string;
} | null {
  if (!months.length) {
    return null;
  }

  const sorted = sortMonths(months);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return null;
  }

  const [yearString, monthString] = last.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const paddedDay = String(lastDay).padStart(2, '0');

  return {
    startDate: `${first}-01`,
    endDate: `${last}-${paddedDay}`,
  };
}

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

export async function fetchMonthlyByCategoryUser({
  supabase,
  householdId,
  months,
}: ViewFetchParams): Promise<MonthlyByCategoryUserRow[]> {
  if (!months.length) {
    return [];
  }

  const query = supabase
    .from('monthly_by_category_user')
    .select('household_id, month, category, user_label, total_cents')
    .in('month', months);

  if (householdId) {
    query.eq('household_id', householdId);
  } else {
    query.is('household_id', null);
  }

  const { data, error } = await query.order('month', { ascending: true });

  if (error) {
    console.error('fetchMonthlyByCategoryUser failed', error);
    return [];
  }

  return (data as MonthlyByCategoryUserRow[]) ?? [];
}

export async function fetchAllMonthlyByCategoryUser({
  supabase,
  householdId,
}: AllFetchParams): Promise<MonthlyByCategoryUserRow[]> {
  const query = supabase
    .from('monthly_by_category_user')
    .select('household_id, month, category, user_label, total_cents')
    .order('month', { ascending: true });

  if (householdId) {
    query.eq('household_id', householdId);
  } else {
    query.is('household_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.error('fetchAllMonthlyByCategoryUser failed', error);
    return [];
  }

  return (data as MonthlyByCategoryUserRow[]) ?? [];
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

export async function fetchDailyTotalsByMonth({
  supabase,
  householdId,
  months,
}: ViewFetchParams): Promise<DailyTotalsByMonthRow[]> {
  if (!months.length) {
    return [];
  }

  const query = supabase
    .from('daily_totals_by_month')
    .select('household_id, month, day, total_cents, cumulative_cents')
    .in('month', months);

  if (householdId) {
    query.eq('household_id', householdId);
  } else {
    query.is('household_id', null);
  }

  const { data, error } = await query
    .order('month', { ascending: true })
    .order('day', { ascending: true });

  if (error) {
    console.error('fetchDailyTotalsByMonth failed', error);
    return [];
  }

  return (data as DailyTotalsByMonthRow[]) ?? [];
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

export async function fetchAllMonthlyCashflowNet({
  supabase,
  householdId,
}: AllFetchParams): Promise<MonthlyCashflowNetRow[]> {
  const query = supabase
    .from('monthly_cashflow_net')
    .select('household_id, month, income_cents, expense_cents, net_cents');

  if (householdId) {
    query.eq('household_id', householdId);
  } else {
    query.is('household_id', null);
  }

  const { data, error } = await query.order('month', { ascending: true });

  if (error) {
    console.error('fetchAllMonthlyCashflowNet failed', error);
    return [];
  }

  return (data as MonthlyCashflowNetRow[]) ?? [];
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

export async function fetchMonthlyBoundsByCategoryUser({
  supabase,
  householdId,
}: BoundsFetchParams): Promise<{
  earliestMonth: string | null;
  latestMonth: string | null;
}> {
  const buildQuery = (ascending: boolean) => {
    const query = supabase
      .from('monthly_by_category_user')
      .select('month')
      .limit(1);

    if (householdId) {
      query.eq('household_id', householdId);
    } else {
      query.is('household_id', null);
    }

    return query.order('month', { ascending });
  };

  const [
    { data: earliestData, error: earliestError },
    { data: latestData, error: latestError },
  ] = await Promise.all([buildQuery(true), buildQuery(false)]);

  if (earliestError || latestError) {
    console.error('fetchMonthlyBoundsByCategoryUser failed', {
      earliestError,
      latestError,
    });
    return { earliestMonth: null, latestMonth: null };
  }

  const earliestMonth =
    (earliestData?.[0] as { month?: string } | undefined)?.month ?? null;
  const latestMonth =
    (latestData?.[0] as { month?: string } | undefined)?.month ?? null;

  return { earliestMonth, latestMonth };
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
