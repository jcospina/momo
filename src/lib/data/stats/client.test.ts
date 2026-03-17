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

import { getDailyComparisonData, getMonthlyHistory } from './client';

jest.mock('@actions/expense-stats', () => ({
  getRingChartData: jest.fn(),
  getMonthlyCategoryRange: jest.fn(),
  getMonthlyCategoryUserRange: jest.fn(),
  getMonthlyWindow: jest.fn(),
  getMonthlyHistory: jest.fn(),
  getMonthlyDataBounds: jest.fn(),
  getMonthlyTotalsRange: jest.fn(),
  getDailyComparisonData: jest.fn(),
  getUserTotalsForMonth: jest.fn(),
  getMonthlyCategoryUserBreakdown: jest.fn(),
}));

describe('data/stats/client facade', () => {
  const getMonthlyHistoryMock = jest.mocked(getMonthlyHistoryAction);
  const getDailyComparisonDataMock = jest.mocked(getDailyComparisonDataAction);
  const getRingChartDataMock = jest.mocked(getRingChartDataAction);
  const getMonthlyCategoryRangeMock = jest.mocked(
    getMonthlyCategoryRangeAction,
  );
  const getMonthlyCategoryUserRangeMock = jest.mocked(
    getMonthlyCategoryUserRangeAction,
  );
  const getMonthlyWindowMock = jest.mocked(getMonthlyWindowAction);
  const getMonthlyDataBoundsMock = jest.mocked(getMonthlyDataBoundsAction);
  const getMonthlyTotalsRangeMock = jest.mocked(getMonthlyTotalsRangeAction);
  const getUserTotalsForMonthMock = jest.mocked(getUserTotalsForMonthAction);
  const getMonthlyCategoryUserBreakdownMock = jest.mocked(
    getMonthlyCategoryUserBreakdownAction,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates monthly history reads', async () => {
    const payload = { scope: 'personal' as const };
    const result = { data: { months: [], rows: [] } };
    getMonthlyHistoryMock.mockResolvedValue(result);

    const actual = await getMonthlyHistory(payload);

    expect(getMonthlyHistoryMock).toHaveBeenCalledWith(payload);
    expect(actual).toEqual(result);
  });

  it('delegates daily comparison reads', async () => {
    const payload = { scope: 'household' as const, currentMonth: '2026-03' };
    const result = {
      data: {
        currentMonth: '2026-03',
        previousMonth: '2026-02',
        current: [],
        previous: [],
      },
    };
    getDailyComparisonDataMock.mockResolvedValue(result);

    const actual = await getDailyComparisonData(payload);

    expect(getDailyComparisonDataMock).toHaveBeenCalledWith(payload);
    expect(actual).toEqual(result);
  });

  it('declares every facade dependency in the action mock', () => {
    expect(getRingChartDataMock).toBeDefined();
    expect(getMonthlyCategoryRangeMock).toBeDefined();
    expect(getMonthlyCategoryUserRangeMock).toBeDefined();
    expect(getMonthlyWindowMock).toBeDefined();
    expect(getMonthlyDataBoundsMock).toBeDefined();
    expect(getMonthlyTotalsRangeMock).toBeDefined();
    expect(getUserTotalsForMonthMock).toBeDefined();
    expect(getMonthlyCategoryUserBreakdownMock).toBeDefined();
  });
});
