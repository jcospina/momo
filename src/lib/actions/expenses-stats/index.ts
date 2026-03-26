'use server';

import {
  getCumulativeSavingsData as getCumulativeSavingsDataImpl,
  getMonthlyIncomeVsExpenseData as getMonthlyIncomeVsExpenseDataImpl,
} from './cashflow-actions';
import {
  getMonthlyCategoryRange as getMonthlyCategoryRangeImpl,
  getMonthlyCategoryUserBreakdown as getMonthlyCategoryUserBreakdownImpl,
  getMonthlyCategoryUserRange as getMonthlyCategoryUserRangeImpl,
  getMonthlyTotalsRange as getMonthlyTotalsRangeImpl,
  getRingChartData as getRingChartDataImpl,
  getUserTotalsForMonth as getUserTotalsForMonthImpl,
} from './category-actions';
import {
  getDailyComparisonData as getDailyComparisonDataImpl,
  getMonthlyDataBounds as getMonthlyDataBoundsImpl,
  getMonthlyHistory as getMonthlyHistoryImpl,
  getMonthlyWindow as getMonthlyWindowImpl,
} from './history-actions';
import type {
  ActionResult,
  CategoryTotal,
  CumulativeSavingsPoint,
  DailyPoint,
  ExpenseStatsScope,
  MonthlyCashflowPoint,
  MonthlyCategoryTotals,
  MonthRangeInput,
  ScopeInput,
} from './types';

export type {
  ActionResult,
  CategoryTotal,
  CumulativeSavingsPoint,
  DailyPoint,
  ExpenseStatsScope,
  MonthlyCashflowPoint,
  MonthlyCategoryTotals,
  MonthRangeInput,
  ScopeInput,
};

export async function getMonthlyIncomeVsExpenseData({
  scope,
  householdId,
}: ScopeInput): Promise<ActionResult<{ months: MonthlyCashflowPoint[] }>> {
  return getMonthlyIncomeVsExpenseDataImpl({ scope, householdId });
}

export async function getCumulativeSavingsData({
  scope,
  householdId,
}: ScopeInput): Promise<ActionResult<{ months: CumulativeSavingsPoint[] }>> {
  return getCumulativeSavingsDataImpl({ scope, householdId });
}

export async function getRingChartData({
  month,
  scope,
  householdId,
}: { month?: string } & ScopeInput): Promise<
  ActionResult<{ month: string; items: CategoryTotal[] }>
> {
  return getRingChartDataImpl({ month, scope, householdId });
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
  return getMonthlyCategoryRangeImpl({
    scope,
    householdId,
    months,
    endMonth,
    count,
  });
}

export async function getMonthlyCategoryUserRange({
  scope,
  householdId,
  months,
  endMonth,
  count,
}: ScopeInput & MonthRangeInput) {
  return getMonthlyCategoryUserRangeImpl({
    scope,
    householdId,
    months,
    endMonth,
    count,
  });
}

export async function getMonthlyWindow({
  scope,
  householdId,
  endMonth,
}: ScopeInput & { endMonth?: string }) {
  return getMonthlyWindowImpl({
    scope,
    householdId,
    endMonth,
  });
}

export async function getMonthlyHistory({ scope, householdId }: ScopeInput) {
  return getMonthlyHistoryImpl({
    scope,
    householdId,
  });
}

export async function getMonthlyDataBounds({ scope, householdId }: ScopeInput) {
  return getMonthlyDataBoundsImpl({
    scope,
    householdId,
  });
}

export async function getMonthlyTotalsRange({
  scope,
  householdId,
  months,
  endMonth,
  count,
}: ScopeInput & MonthRangeInput) {
  return getMonthlyTotalsRangeImpl({
    scope,
    householdId,
    months,
    endMonth,
    count,
  });
}

export async function getDailyComparisonData({
  scope,
  householdId,
  currentMonth,
  previousMonth,
}: ScopeInput & {
  currentMonth?: string;
  previousMonth?: string;
}) {
  return getDailyComparisonDataImpl({
    scope,
    householdId,
    currentMonth,
    previousMonth,
  });
}

export async function getUserTotalsForMonth({
  month,
  scope,
  householdId,
}: { month?: string } & ScopeInput) {
  return getUserTotalsForMonthImpl({
    month,
    scope,
    householdId,
  });
}

export async function getMonthlyCategoryUserBreakdown({
  month,
  scope,
  householdId,
}: { month?: string } & ScopeInput) {
  return getMonthlyCategoryUserBreakdownImpl({
    month,
    scope,
    householdId,
  });
}
