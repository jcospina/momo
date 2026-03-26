import {
  fetchAllPersonalRollupMonthlyByCategoryUser,
  fetchAllPersonalRollupMonthlyCashflowNet,
  fetchPersonalRollupDailyTotalsByMonth,
  fetchPersonalRollupMonthlyBoundsByCategoryUser,
  fetchPersonalRollupMonthlyByCategoryUser,
} from './expense-stats';

type PersonalRollupExpenseRow = {
  user_id: string;
  expense_date: string;
  category: string | null;
  amount_cents: number;
};

function createPersonalRollupSupabase(rows: PersonalRollupExpenseRow[]) {
  const tracker = {
    fromCalls: [] as string[],
    eqCalls: [] as Array<{ column: string; value: string }>,
    neqCalls: [] as Array<{ column: string; value: string }>,
    gteCalls: [] as Array<{ column: string; value: string }>,
    lteCalls: [] as Array<{ column: string; value: string }>,
  };

  return {
    tracker,
    supabase: {
      from(table: string) {
        tracker.fromCalls.push(table);

        let selectedUserId: string | null = null;
        let excludedCategory: string | null = null;
        let fromDate: string | null = null;
        let toDate: string | null = null;

        return {
          select() {
            return this;
          },
          eq(column: string, value: string) {
            if (column === 'user_id') {
              selectedUserId = value;
              tracker.eqCalls.push({ column, value });
            }
            return this;
          },
          neq(column: string, value: string) {
            if (column === 'category') {
              excludedCategory = value;
              tracker.neqCalls.push({ column, value });
            }
            return this;
          },
          gte(column: string, value: string) {
            if (column === 'expense_date') {
              fromDate = value;
              tracker.gteCalls.push({ column, value });
            }
            return this;
          },
          lte(column: string, value: string) {
            if (column === 'expense_date') {
              toDate = value;
              tracker.lteCalls.push({ column, value });
            }
            return this;
          },
          order(_column: string) {
            const filtered = rows
              .filter(row => !selectedUserId || row.user_id === selectedUserId)
              .filter(row =>
                excludedCategory === null
                  ? true
                  : row.category !== excludedCategory,
              )
              .filter(row => (fromDate ? row.expense_date >= fromDate : true))
              .filter(row => (toDate ? row.expense_date <= toDate : true))
              .sort((left, right) =>
                left.expense_date.localeCompare(right.expense_date),
              )
              .map(({ expense_date, category, amount_cents }) => ({
                expense_date,
                category,
                amount_cents,
              }));

            return Promise.resolve({ data: filtered, error: null });
          },
        };
      },
    },
  };
}

describe('expense-stats personal rollup source helpers', () => {
  it('builds monthly category totals for the current user across scopes', async () => {
    const { supabase, tracker } = createPersonalRollupSupabase([
      {
        user_id: 'user-1',
        expense_date: '2024-01-02',
        category: 'food',
        amount_cents: 100,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-01-15',
        category: null,
        amount_cents: 50,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-02-09',
        category: 'income',
        amount_cents: 500,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-03-01',
        category: 'food',
        amount_cents: 700,
      },
      {
        user_id: 'user-2',
        expense_date: '2024-01-20',
        category: 'food',
        amount_cents: 999,
      },
    ]);

    const result = await fetchPersonalRollupMonthlyByCategoryUser({
      supabase: supabase as never,
      userId: 'user-1',
      months: ['2024-01', '2024-02'],
    });

    expect(tracker.fromCalls).toEqual(['expenses']);
    expect(tracker.eqCalls).toContainEqual({
      column: 'user_id',
      value: 'user-1',
    });
    expect(tracker.neqCalls).toContainEqual({
      column: 'category',
      value: 'income',
    });
    expect(tracker.gteCalls).toContainEqual({
      column: 'expense_date',
      value: '2024-01-01',
    });
    expect(tracker.lteCalls).toContainEqual({
      column: 'expense_date',
      value: '2024-02-29',
    });
    expect(result).toEqual([
      {
        household_id: null,
        month: '2024-01',
        category: 'food',
        user_label: 'Current user',
        total_cents: 100,
      },
      {
        household_id: null,
        month: '2024-01',
        category: 'uncategorized',
        user_label: 'Current user',
        total_cents: 50,
      },
    ]);
  });

  it('builds daily totals with per-month cumulative values', async () => {
    const { supabase } = createPersonalRollupSupabase([
      {
        user_id: 'user-1',
        expense_date: '2024-03-02',
        category: 'food',
        amount_cents: 100,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-03-02',
        category: 'food',
        amount_cents: 50,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-03-10',
        category: 'transport',
        amount_cents: 25,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-03-03',
        category: 'income',
        amount_cents: 500,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-02-01',
        category: 'rent',
        amount_cents: 75,
      },
      {
        user_id: 'user-2',
        expense_date: '2024-03-02',
        category: 'food',
        amount_cents: 999,
      },
    ]);

    const result = await fetchPersonalRollupDailyTotalsByMonth({
      supabase: supabase as never,
      userId: 'user-1',
      months: ['2024-02', '2024-03'],
    });

    expect(result).toEqual([
      {
        household_id: null,
        month: '2024-02',
        day: 1,
        total_cents: 75,
        cumulative_cents: 75,
      },
      {
        household_id: null,
        month: '2024-03',
        day: 2,
        total_cents: 150,
        cumulative_cents: 150,
      },
      {
        household_id: null,
        month: '2024-03',
        day: 10,
        total_cents: 25,
        cumulative_cents: 175,
      },
    ]);
  });

  it('builds monthly cashflow totals for the current user across scopes', async () => {
    const { supabase, tracker } = createPersonalRollupSupabase([
      {
        user_id: 'user-1',
        expense_date: '2024-01-01',
        category: 'income',
        amount_cents: 1000,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-01-03',
        category: 'rent',
        amount_cents: 300,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-01-10',
        category: 'groceries',
        amount_cents: 200,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-02-01',
        category: 'income',
        amount_cents: 800,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-02-07',
        category: 'income',
        amount_cents: 200,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-02-08',
        category: 'utilities',
        amount_cents: 100,
      },
      {
        user_id: 'user-2',
        expense_date: '2024-02-08',
        category: 'income',
        amount_cents: 999999,
      },
    ]);

    const result = await fetchAllPersonalRollupMonthlyCashflowNet({
      supabase: supabase as never,
      userId: 'user-1',
    });

    expect(tracker.fromCalls).toEqual(['expenses']);
    expect(tracker.neqCalls).toHaveLength(0);
    expect(result).toEqual([
      {
        household_id: null,
        month: '2024-01',
        income_cents: 1000,
        expense_cents: 500,
        net_cents: 500,
      },
      {
        household_id: null,
        month: '2024-02',
        income_cents: 1000,
        expense_cents: 100,
        net_cents: 900,
      },
    ]);
  });

  it('returns all-month expense rollups and bounds for personal scope', async () => {
    const { supabase } = createPersonalRollupSupabase([
      {
        user_id: 'user-1',
        expense_date: '2023-11-12',
        category: 'food',
        amount_cents: 10,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-01-05',
        category: 'transport',
        amount_cents: 20,
      },
      {
        user_id: 'user-1',
        expense_date: '2024-02-06',
        category: 'income',
        amount_cents: 30,
      },
      {
        user_id: 'user-2',
        expense_date: '2025-01-01',
        category: 'food',
        amount_cents: 999,
      },
    ]);

    const rows = await fetchAllPersonalRollupMonthlyByCategoryUser({
      supabase: supabase as never,
      userId: 'user-1',
    });
    const bounds = await fetchPersonalRollupMonthlyBoundsByCategoryUser({
      supabase: supabase as never,
      userId: 'user-1',
    });

    expect(rows).toEqual([
      {
        household_id: null,
        month: '2023-11',
        category: 'food',
        user_label: 'Current user',
        total_cents: 10,
      },
      {
        household_id: null,
        month: '2024-01',
        category: 'transport',
        user_label: 'Current user',
        total_cents: 20,
      },
    ]);
    expect(bounds).toEqual({
      earliestMonth: '2023-11',
      latestMonth: '2024-01',
    });
  });
});
