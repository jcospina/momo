import type {
  MonthlyByCategoryUserRow,
  UserTotalPoint,
} from '@lib-types/expense-stats';
import { format } from 'date-fns';
import { buildMonthlyCategoryTotals, normalizeCategory } from './builders';
import { buildMonthRange, normalizeMonth } from './month-utils';
import { readMonthlyByCategoryRows } from './readers';
import { getScopedContext } from './scope';
import type {
  ActionResult,
  CategoryTotal,
  MonthlyCategoryTotals,
  MonthRangeInput,
  ScopeInput,
} from './types';

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

  const { context, errorCode } = await getScopedContext({
    scope,
    householdId,
  });
  if (!context) {
    return {
      data: { month: targetMonth, items: [] },
      errorCode,
    };
  }

  const rows = await readMonthlyByCategoryRows({
    context,
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

  return {
    data: {
      month: targetMonth,
      items,
    },
  };
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
  const range = buildMonthRange({
    months,
    endMonth,
    count,
  });
  if (!range.length) {
    return { data: { months: [] } };
  }

  const { context, errorCode } = await getScopedContext({
    scope,
    householdId,
  });
  if (!context) {
    return { data: { months: [] }, errorCode };
  }

  const rows = await readMonthlyByCategoryRows({
    context,
    months: range,
  });

  const categoryRows = rows.map(row => ({
    month: row.month,
    category: row.category,
    total_cents: row.total_cents,
  }));

  return {
    data: {
      months: buildMonthlyCategoryTotals(range, categoryRows),
    },
  };
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
  const range = buildMonthRange({
    months,
    endMonth,
    count,
  });
  if (!range.length) {
    return { data: { months: [], rows: [] } };
  }

  const { context, errorCode } = await getScopedContext({
    scope,
    householdId,
  });
  if (!context) {
    return { data: { months: [], rows: [] }, errorCode };
  }

  const rows = await readMonthlyByCategoryRows({
    context,
    months: range,
  });

  return { data: { months: range, rows } };
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
  const range = buildMonthRange({
    months,
    endMonth,
    count,
  });
  if (!range.length) {
    return { data: { months: [] } };
  }

  const { context, errorCode } = await getScopedContext({
    scope,
    householdId,
  });
  if (!context) {
    return { data: { months: [] }, errorCode };
  }

  const rows = await readMonthlyByCategoryRows({
    context,
    months: range,
  });

  const totalsMap = new Map<string, number>();
  rows.forEach(row => {
    totalsMap.set(row.month, (totalsMap.get(row.month) ?? 0) + row.total_cents);
  });

  return {
    data: {
      months: range.map(month => ({
        month,
        totalCents: totalsMap.get(month) ?? 0,
      })),
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

  const { context, errorCode } = await getScopedContext({
    scope,
    householdId,
  });
  if (!context) {
    return {
      data: { month: targetMonth, items: [] },
      errorCode,
    };
  }

  const rows = await readMonthlyByCategoryRows({
    context,
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

  return {
    data: {
      month: targetMonth,
      items,
    },
  };
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

  const { context, errorCode } = await getScopedContext({
    scope,
    householdId,
  });
  if (!context) {
    return {
      data: { month: targetMonth, rows: [] },
      errorCode,
    };
  }

  const rows = await readMonthlyByCategoryRows({
    context,
    months: [targetMonth],
  });

  return { data: { month: targetMonth, rows } };
}
