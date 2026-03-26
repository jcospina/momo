import type { MonthlyByCategoryUserRow } from '@lib-types/expense-stats';
import { format, parse, subMonths } from 'date-fns';
import { buildDailyPoints } from './builders';
import {
  buildMonthRange,
  buildMonthSpan,
  normalizeMonth,
  uniqueMonths,
} from './month-utils';
import {
  readAllMonthlyByCategoryRows,
  readDailyTotalsRows,
  readMonthlyBounds,
  readMonthlyByCategoryRows,
} from './readers';
import { getScopedContext } from './scope';
import type { ActionResult, DailyPoint, ScopeInput } from './types';

export async function getMonthlyWindow({
  scope,
  householdId,
  endMonth,
}: ScopeInput & { endMonth?: string }): Promise<
  ActionResult<{ months: string[]; rows: MonthlyByCategoryUserRow[] }>
> {
  const range = buildMonthRange({
    endMonth,
    count: 12,
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

export async function getMonthlyHistory({
  scope,
  householdId,
}: ScopeInput): Promise<
  ActionResult<{ months: string[]; rows: MonthlyByCategoryUserRow[] }>
> {
  const { context, errorCode } = await getScopedContext({
    scope,
    householdId,
  });
  if (!context) {
    return { data: { months: [], rows: [] }, errorCode };
  }

  const rows = await readAllMonthlyByCategoryRows({ context });
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

  const { context, errorCode } = await getScopedContext({
    scope,
    householdId,
  });
  if (!context) {
    return {
      data: {
        earliestMonth: null,
        currentMonth,
      },
      errorCode,
    };
  }

  const bounds = await readMonthlyBounds({ context });
  return {
    data: {
      earliestMonth: bounds.earliestMonth,
      currentMonth,
    },
  };
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

  const { context, errorCode } = await getScopedContext({
    scope,
    householdId,
  });
  if (!context) {
    return {
      data: {
        currentMonth: normalizedCurrent,
        previousMonth: normalizedPrevious,
        current: [],
        previous: [],
      },
      errorCode,
    };
  }

  const rows = await readDailyTotalsRows({
    context,
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
