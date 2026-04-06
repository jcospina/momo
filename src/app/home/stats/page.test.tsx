import { render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import type { ReactNode } from 'react';
import StatsPage from './page';

const expenseScopePanelsSpy = jest.fn();
const redirectSpy = jest.fn();

jest.mock('@components/navbar/navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

jest.mock('@components/stats/expense-scope-panels', () => ({
  ExpenseScopePanels: (props: unknown) => {
    expenseScopePanelsSpy(props);
    return <div data-testid="expense-scope-panels" />;
  },
}));

jest.mock('@ui/flex/flex', () => ({
  Flex: ({ children }: { children: ReactNode }) => (
    <div data-testid="flex">{children}</div>
  ),
}));

jest.mock('next/navigation', () => ({
  redirect: (path: string) => {
    redirectSpy(path);
    throw new Error('NEXT_REDIRECT');
  },
}));

jest.mock('@/lib/data/auth/server', () => ({
  getCurrentUser: jest.fn(),
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

import { getCurrentUser } from '@/lib/data/auth/server';
import { getUserPreferences } from '@/lib/data/prefs/server';
import {
  getCumulativeSavingsData,
  getDailyComparisonData,
  getMonthlyHistory,
  getMonthlyIncomeVsExpenseData,
} from '@/lib/data/stats/server';

describe('/home/stats page', () => {
  const getCurrentUserMock = jest.mocked(getCurrentUser);
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

    getCurrentUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    } as Awaited<ReturnType<typeof getCurrentUser>>);
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

    render(await StatsPage());

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

  it('keeps personal data active and skips household scoped reads when no household is available', async () => {
    const currentMonth = format(new Date(), 'yyyy-MM');

    getCurrentUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    } as Awaited<ReturnType<typeof getCurrentUser>>);
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

    render(await StatsPage());

    expect(getDailyComparisonDataMock).toHaveBeenCalledTimes(1);
    expect(getDailyComparisonDataMock).toHaveBeenCalledWith({
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

  it('redirects to /login when no user is present', async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(StatsPage()).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectSpy).toHaveBeenCalledWith('/login');
    expect(expenseScopePanelsSpy).not.toHaveBeenCalled();
  });
});
