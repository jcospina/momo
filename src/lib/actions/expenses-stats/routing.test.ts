import {
  getDailyComparisonData,
  getMonthlyDataBounds,
  getMonthlyHistory,
  getMonthlyIncomeVsExpenseData,
} from './index';

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@helpers/households', () => ({
  fetchHouseholdMembership: jest.fn(),
}));

jest.mock('@helpers/expenses-stats', () => ({
  fetchAllMonthlyByCategoryUser: jest.fn(),
  fetchAllMonthlyCashflowNet: jest.fn(),
  fetchAllPersonalRollupMonthlyByCategoryUser: jest.fn(),
  fetchAllPersonalRollupMonthlyCashflowNet: jest.fn(),
  fetchDailyTotalsByMonth: jest.fn(),
  fetchMonthlyBoundsByCategoryUser: jest.fn(),
  fetchMonthlyByCategoryUser: jest.fn(),
  fetchPersonalRollupDailyTotalsByMonth: jest.fn(),
  fetchPersonalRollupMonthlyBoundsByCategoryUser: jest.fn(),
  fetchPersonalRollupMonthlyByCategoryUser: jest.fn(),
}));

const { createSupabaseServerClient } = jest.requireMock(
  '@lib-supabase/server',
) as { createSupabaseServerClient: jest.Mock };

const expenseStatsHelpers = jest.requireMock('@helpers/expenses-stats') as {
  fetchAllMonthlyByCategoryUser: jest.Mock;
  fetchAllMonthlyCashflowNet: jest.Mock;
  fetchAllPersonalRollupMonthlyByCategoryUser: jest.Mock;
  fetchAllPersonalRollupMonthlyCashflowNet: jest.Mock;
  fetchDailyTotalsByMonth: jest.Mock;
  fetchMonthlyBoundsByCategoryUser: jest.Mock;
  fetchMonthlyByCategoryUser: jest.Mock;
  fetchPersonalRollupDailyTotalsByMonth: jest.Mock;
  fetchPersonalRollupMonthlyBoundsByCategoryUser: jest.Mock;
  fetchPersonalRollupMonthlyByCategoryUser: jest.Mock;
};

describe('expense-stats routing for personal rollup', () => {
  const supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createSupabaseServerClient.mockResolvedValue(supabase);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('routes personal monthly history through the personal rollup source', async () => {
    const rollupRows = [
      {
        household_id: null,
        month: '2024-04',
        category: 'food',
        user_label: 'Current user',
        total_cents: 100,
      },
    ];
    expenseStatsHelpers.fetchAllPersonalRollupMonthlyByCategoryUser.mockResolvedValue(
      rollupRows,
    );

    const result = await getMonthlyHistory({ scope: 'personal' });

    expect(
      expenseStatsHelpers.fetchAllPersonalRollupMonthlyByCategoryUser,
    ).toHaveBeenCalledWith({
      supabase,
      userId: 'user-1',
    });
    expect(
      expenseStatsHelpers.fetchAllMonthlyByCategoryUser,
    ).not.toHaveBeenCalled();
    expect(result.errorCode).toBeUndefined();
    expect(result.data).toEqual({
      months: ['2024-04', '2024-05', '2024-06'],
      rows: rollupRows,
    });
  });

  it('routes personal daily comparison through the personal rollup source', async () => {
    expenseStatsHelpers.fetchPersonalRollupDailyTotalsByMonth.mockResolvedValue(
      [
        {
          household_id: null,
          month: '2024-05',
          day: 3,
          total_cents: 10,
          cumulative_cents: 10,
        },
        {
          household_id: null,
          month: '2024-06',
          day: 5,
          total_cents: 30,
          cumulative_cents: 30,
        },
      ],
    );

    const result = await getDailyComparisonData({
      scope: 'personal',
      currentMonth: '2024-06',
      previousMonth: '2024-05',
    });

    expect(
      expenseStatsHelpers.fetchPersonalRollupDailyTotalsByMonth,
    ).toHaveBeenCalledWith({
      supabase,
      userId: 'user-1',
      months: ['2024-06', '2024-05'],
    });
    expect(expenseStatsHelpers.fetchDailyTotalsByMonth).not.toHaveBeenCalled();
    expect(result.errorCode).toBeUndefined();
    expect(result.data.current).toEqual([
      {
        day: 5,
        totalCents: 30,
      },
    ]);
    expect(result.data.previous).toEqual([
      {
        day: 3,
        totalCents: 10,
      },
    ]);
  });

  it('routes personal monthly cashflow through the personal rollup source', async () => {
    expenseStatsHelpers.fetchAllPersonalRollupMonthlyCashflowNet.mockResolvedValue(
      [
        {
          household_id: null,
          month: '2024-04',
          income_cents: 150,
          expense_cents: 90,
          net_cents: 60,
        },
        {
          household_id: null,
          month: '2024-06',
          income_cents: 120,
          expense_cents: 100,
          net_cents: 20,
        },
      ],
    );

    const result = await getMonthlyIncomeVsExpenseData({ scope: 'personal' });

    expect(
      expenseStatsHelpers.fetchAllPersonalRollupMonthlyCashflowNet,
    ).toHaveBeenCalledWith({
      supabase,
      userId: 'user-1',
    });
    expect(
      expenseStatsHelpers.fetchAllMonthlyCashflowNet,
    ).not.toHaveBeenCalled();
    expect(result.errorCode).toBeUndefined();
    expect(result.data.months).toEqual([
      {
        month: '2024-04',
        incomeCents: 150,
        expenseCents: 90,
        netCents: 60,
      },
      {
        month: '2024-05',
        incomeCents: 0,
        expenseCents: 0,
        netCents: 0,
      },
      {
        month: '2024-06',
        incomeCents: 120,
        expenseCents: 100,
        netCents: 20,
      },
    ]);
  });

  it('keeps household monthly cashflow routing unchanged', async () => {
    expenseStatsHelpers.fetchAllMonthlyCashflowNet.mockResolvedValue([
      {
        household_id: 'household-1',
        month: '2024-06',
        income_cents: 200,
        expense_cents: 100,
        net_cents: 100,
      },
    ]);

    const result = await getMonthlyIncomeVsExpenseData({
      scope: 'household',
      householdId: 'household-1',
    });

    expect(expenseStatsHelpers.fetchAllMonthlyCashflowNet).toHaveBeenCalledWith(
      {
        supabase,
        householdId: 'household-1',
      },
    );
    expect(
      expenseStatsHelpers.fetchAllPersonalRollupMonthlyCashflowNet,
    ).not.toHaveBeenCalled();
    expect(result.errorCode).toBeUndefined();
    expect(result.data.months).toEqual([
      {
        month: '2024-06',
        incomeCents: 200,
        expenseCents: 100,
        netCents: 100,
      },
    ]);
  });

  it('routes personal bounds reads through the personal rollup source', async () => {
    expenseStatsHelpers.fetchPersonalRollupMonthlyBoundsByCategoryUser.mockResolvedValue(
      {
        earliestMonth: '2024-01',
        latestMonth: '2024-06',
      },
    );

    const result = await getMonthlyDataBounds({ scope: 'personal' });

    expect(
      expenseStatsHelpers.fetchPersonalRollupMonthlyBoundsByCategoryUser,
    ).toHaveBeenCalledWith({
      supabase,
      userId: 'user-1',
    });
    expect(
      expenseStatsHelpers.fetchMonthlyBoundsByCategoryUser,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: {
        earliestMonth: '2024-01',
        currentMonth: '2024-06',
      },
    });
  });
});
