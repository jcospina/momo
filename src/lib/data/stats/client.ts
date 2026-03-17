import {
  getDailyComparisonData as getDailyComparisonDataAction,
  getMonthlyCategoryRange as getMonthlyCategoryRangeAction,
  getMonthlyCategoryUserBreakdown as getMonthlyCategoryUserBreakdownAction,
  getMonthlyCategoryUserRange as getMonthlyCategoryUserRangeAction,
  getMonthlyDataBounds as getMonthlyDataBoundsAction,
  getMonthlyHistory as getMonthlyHistoryAction,
  getMonthlyTotalsRange as getMonthlyTotalsRangeAction,
  getMonthlyWindow as getMonthlyWindowAction,
  getRingChartData as getRingChartDataAction,
  getUserTotalsForMonth as getUserTotalsForMonthAction,
} from '@actions/expense-stats';

import type {
  GetDailyComparisonData,
  GetMonthlyCategoryRange,
  GetMonthlyCategoryUserBreakdown,
  GetMonthlyCategoryUserRange,
  GetMonthlyDataBounds,
  GetMonthlyHistory,
  GetMonthlyTotalsRange,
  GetMonthlyWindow,
  GetRingChartData,
  GetUserTotalsForMonth,
} from './types';

export const getRingChartData: GetRingChartData = async input =>
  getRingChartDataAction(input);

export const getMonthlyCategoryRange: GetMonthlyCategoryRange = async input =>
  getMonthlyCategoryRangeAction(input);

export const getMonthlyCategoryUserRange: GetMonthlyCategoryUserRange =
  async input => getMonthlyCategoryUserRangeAction(input);

export const getMonthlyWindow: GetMonthlyWindow = async input =>
  getMonthlyWindowAction(input);

export const getMonthlyHistory: GetMonthlyHistory = async input =>
  getMonthlyHistoryAction(input);

export const getMonthlyDataBounds: GetMonthlyDataBounds = async input =>
  getMonthlyDataBoundsAction(input);

export const getMonthlyTotalsRange: GetMonthlyTotalsRange = async input =>
  getMonthlyTotalsRangeAction(input);

export const getDailyComparisonData: GetDailyComparisonData = async input =>
  getDailyComparisonDataAction(input);

export const getUserTotalsForMonth: GetUserTotalsForMonth = async input =>
  getUserTotalsForMonthAction(input);

export const getMonthlyCategoryUserBreakdown: GetMonthlyCategoryUserBreakdown =
  async input => getMonthlyCategoryUserBreakdownAction(input);
