import { format } from 'date-fns';
import {
  buildCumulativeSavingsPoints,
  buildMonthlyCashflowPoints,
} from './builders';
import { buildMonthSpan, uniqueMonths } from './month-utils';
import { readAllMonthlyCashflowRows } from './readers';
import { getScopedContext } from './scope';
import type {
  ActionResult,
  CumulativeSavingsPoint,
  MonthlyCashflowPoint,
  ScopeInput,
} from './types';

async function getMonthlyCashflowHistory({
  scope,
  householdId,
}: ScopeInput): Promise<ActionResult<{ months: MonthlyCashflowPoint[] }>> {
  const { context, errorCode } = await getScopedContext({
    scope,
    householdId,
  });
  if (!context) {
    return { data: { months: [] }, errorCode };
  }

  const rows = await readAllMonthlyCashflowRows({ context });
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

export async function getMonthlyIncomeVsExpenseData({
  scope,
  householdId,
}: ScopeInput): Promise<ActionResult<{ months: MonthlyCashflowPoint[] }>> {
  return getMonthlyCashflowHistory({
    scope,
    householdId,
  });
}

export async function getCumulativeSavingsData({
  scope,
  householdId,
}: ScopeInput): Promise<ActionResult<{ months: CumulativeSavingsPoint[] }>> {
  const history = await getMonthlyCashflowHistory({
    scope,
    householdId,
  });

  if (history.errorCode) {
    return { data: { months: [] }, errorCode: history.errorCode };
  }

  return {
    data: {
      months: buildCumulativeSavingsPoints(history.data.months),
    },
  };
}
