import { render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { loadStats, StatsContent } from './stats-content';

const expenseScopePanelsSpy = jest.fn();

jest.mock('@components/navbar/app-navbar', () => ({
  AppNavbar: () => <div data-testid="navbar" />,
}));

jest.mock('@components/stats/expense-scope-panels', () => ({
  ExpenseScopePanels: (props: unknown) => {
    expenseScopePanelsSpy(props);
    return <div data-testid="expense-scope-panels" />;
  },
}));

jest.mock('@/app/home/session', () => ({
  requireProfile: jest.fn(),
}));

jest.mock('@/lib/data/prefs/server', () => ({
  getUserPreferences: jest.fn(),
}));

jest.mock('@/lib/data/stats/server', () => ({
  getMonthlyHistory: jest.fn(),
  getDailyComparisonData: jest.fn(),
  getMonthlyIncomeVsExpenseData: jest.fn(),
  getCumulativeSavingsData: jest.fn(),
}));

import { requireProfile } from '@/app/home/session';
import { getUserPreferences } from '@/lib/data/prefs/server';
import {
  getCumulativeSavingsData,
  getDailyComparisonData,
  getMonthlyHistory,
  getMonthlyIncomeVsExpenseData,
} from '@/lib/data/stats/server';

describe('/home/stats content', () => {
  const requireProfileMock = jest.mocked(requireProfile);
  const getUserPreferencesMock = jest.mocked(getUserPreferences);
  const getMonthlyHistoryMock = jest.mocked(getMonthlyHistory);
  const getDailyComparisonDataMock = jest.mocked(getDailyComparisonData);
  const getMonthlyIncomeVsExpenseDataMock = jest.mocked(
    getMonthlyIncomeVsExpenseData,
  );
  const getCumulativeSavingsDataMock = jest.mocked(getCumulativeSavingsData);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('passes personal rollup data and household-wide data into scope panels', async () => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const personalRows = [
      {
        household_id: null,
        month: '2026-03',
        category: 'food',
        user_label: 'You',
        total_cents: 1000,
      },
      {
        household_id: 'house-1',
        month: '2026-03',
        category: 'transport',
        user_label: 'You',
        total_cents: 2000,
      },
    ];
    const householdRows = [
      {
        household_id: 'house-1',
        month: '2026-03',
        category: 'food',
        user_label: 'Partner',
        total_cents: 3000,
      },
    ];

    requireProfileMock.mockResolvedValue({
      user_id: 'user-1',
    } as Awaited<ReturnType<typeof requireProfile>>);
    getUserPreferencesMock.mockResolvedValue({
      currency: 'COP',
    } as Awaited<ReturnType<typeof getUserPreferences>>);
    getMonthlyHistoryMock
      .mockResolvedValueOnce({
        data: { months: ['2026-03'], rows: personalRows },
      })
      .mockResolvedValueOnce({
        data: { months: ['2026-03'], rows: householdRows },
      });
    getDailyComparisonDataMock
      .mockResolvedValueOnce({
        data: {
          currentMonth: '2026-03',
          previousMonth: '2026-02',
          current: [{ day: 1, totalCents: 3000 }],
          previous: [{ day: 1, totalCents: 1500 }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          currentMonth: '2026-03',
          previousMonth: '2026-02',
          current: [{ day: 1, totalCents: 7000 }],
          previous: [{ day: 1, totalCents: 4000 }],
        },
      });
    getMonthlyIncomeVsExpenseDataMock.mockResolvedValueOnce({
      data: {
        months: [
          {
            month: '2026-03',
            incomeCents: 100_000,
            expenseCents: 30_000,
            netCents: 70_000,
          },
        ],
      },
    });
    getCumulativeSavingsDataMock.mockResolvedValueOnce({
      data: {
        months: [
          {
            month: '2026-03',
            netCents: 70_000,
            cumulativeCents: 70_000,
          },
        ],
      },
    });

    render(await StatsContent({ stats: loadStats('user-1') }));

    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('expense-scope-panels')).toBeInTheDocument();

    expect(getMonthlyHistoryMock).toHaveBeenNthCalledWith(1, {
      scope: 'personal',
    });
    expect(getMonthlyHistoryMock).toHaveBeenNthCalledWith(2, {
      scope: 'household',
    });
    expect(getDailyComparisonDataMock).toHaveBeenNthCalledWith(1, {
      currentMonth,
      scope: 'personal',
    });
    expect(getDailyComparisonDataMock).toHaveBeenNthCalledWith(2, {
      currentMonth,
      scope: 'household',
    });
    expect(getMonthlyIncomeVsExpenseDataMock).toHaveBeenCalledTimes(1);
    expect(getMonthlyIncomeVsExpenseDataMock).toHaveBeenCalledWith({
      scope: 'personal',
    });
    expect(getCumulativeSavingsDataMock).toHaveBeenCalledTimes(1);
    expect(getCumulativeSavingsDataMock).toHaveBeenCalledWith({
      scope: 'personal',
    });

    expect(expenseScopePanelsSpy).toHaveBeenCalledWith({
      currency: 'COP',
      householdAvailable: true,
      personal: {
        months: ['2026-03'],
        rows: personalRows,
        daily: {
          currentMonth: '2026-03',
          previousMonth: '2026-02',
          current: [{ day: 1, totalCents: 3000 }],
          previous: [{ day: 1, totalCents: 1500 }],
        },
        cashflow: {
          monthlyIncomeVsExpense: [
            {
              month: '2026-03',
              incomeCents: 100_000,
              expenseCents: 30_000,
              netCents: 70_000,
            },
          ],
          cumulativeSavings: [
            {
              month: '2026-03',
              netCents: 70_000,
              cumulativeCents: 70_000,
            },
          ],
        },
      },
      household: {
        months: ['2026-03'],
        rows: householdRows,
        daily: {
          currentMonth: '2026-03',
          previousMonth: '2026-02',
          current: [{ day: 1, totalCents: 7000 }],
          previous: [{ day: 1, totalCents: 4000 }],
        },
        cashflow: {
          monthlyIncomeVsExpense: [],
          cumulativeSavings: [],
        },
      },
    });
  });

  it('keeps personal data active and drops the household comparison when no household is available', async () => {
    const currentMonth = format(new Date(), 'yyyy-MM');

    requireProfileMock.mockResolvedValue({
      user_id: 'user-1',
    } as Awaited<ReturnType<typeof requireProfile>>);
    getUserPreferencesMock.mockResolvedValue({
      currency: 'USD',
    } as Awaited<ReturnType<typeof getUserPreferences>>);
    getMonthlyHistoryMock
      .mockResolvedValueOnce({
        data: { months: ['2026-03'], rows: [] },
      })
      .mockResolvedValueOnce({
        data: { months: [], rows: [] },
        errorCode: 'no_household',
      });
    getDailyComparisonDataMock.mockResolvedValueOnce({
      data: {
        currentMonth: '2026-03',
        previousMonth: '2026-02',
        current: [{ day: 1, totalCents: 1000 }],
        previous: [{ day: 1, totalCents: 500 }],
      },
    });
    getMonthlyIncomeVsExpenseDataMock.mockResolvedValueOnce({
      data: {
        months: [
          {
            month: '2026-03',
            incomeCents: 90_000,
            expenseCents: 20_000,
            netCents: 70_000,
          },
        ],
      },
    });
    getCumulativeSavingsDataMock.mockResolvedValueOnce({
      data: {
        months: [
          { month: '2026-03', netCents: 70_000, cumulativeCents: 70_000 },
        ],
      },
    });

    render(await StatsContent({ stats: loadStats('user-1') }));

    // The household comparison is requested alongside the household history
    // (it stops at the membership check) and its result is replaced below.
    expect(getDailyComparisonDataMock).toHaveBeenNthCalledWith(1, {
      currentMonth,
      scope: 'personal',
    });
    expect(getMonthlyIncomeVsExpenseDataMock).toHaveBeenCalledTimes(1);
    expect(getMonthlyIncomeVsExpenseDataMock).toHaveBeenCalledWith({
      scope: 'personal',
    });
    expect(getCumulativeSavingsDataMock).toHaveBeenCalledTimes(1);
    expect(getCumulativeSavingsDataMock).toHaveBeenCalledWith({
      scope: 'personal',
    });

    expect(expenseScopePanelsSpy).toHaveBeenCalledWith({
      currency: 'USD',
      householdAvailable: false,
      personal: {
        months: ['2026-03'],
        rows: [],
        daily: {
          currentMonth: '2026-03',
          previousMonth: '2026-02',
          current: [{ day: 1, totalCents: 1000 }],
          previous: [{ day: 1, totalCents: 500 }],
        },
        cashflow: {
          monthlyIncomeVsExpense: [
            {
              month: '2026-03',
              incomeCents: 90_000,
              expenseCents: 20_000,
              netCents: 70_000,
            },
          ],
          cumulativeSavings: [
            {
              month: '2026-03',
              netCents: 70_000,
              cumulativeCents: 70_000,
            },
          ],
        },
      },
      household: {
        months: [],
        rows: [],
        daily: {
          currentMonth,
          previousMonth: currentMonth,
          current: [],
          previous: [],
        },
        cashflow: {
          monthlyIncomeVsExpense: [],
          cumulativeSavings: [],
        },
      },
    });
  });

  it('rejects with the redirect when the profile is missing', async () => {
    // requireProfile redirects to /login by throwing (see session.test.ts).
    requireProfileMock.mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(StatsContent({ stats: loadStats('user-1') })).rejects.toThrow(
      'NEXT_REDIRECT',
    );

    expect(requireProfileMock).toHaveBeenCalledWith('user-1');
    expect(expenseScopePanelsSpy).not.toHaveBeenCalled();
  });
});
