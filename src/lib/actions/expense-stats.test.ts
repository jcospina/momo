import {
  buildMonthList,
  buildMonthlyByCategoryUserRows,
} from '@/mocks/expense-stats-samples';
import {
  getCumulativeSavingsData,
  getMonthlyDataBounds,
  getMonthlyHistory,
  getMonthlyIncomeVsExpenseData,
  getMonthlyWindow,
} from './expense-stats';

jest.mock('@lib-supabase/server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const { createSupabaseServerClient } = jest.requireMock(
  '@lib-supabase/server',
) as { createSupabaseServerClient: jest.Mock };

function createBoundsSupabase(months: string[]) {
  const builder = {
    select() {
      return this;
    },
    limit() {
      return this;
    },
    in() {
      return this;
    },
    eq() {
      return this;
    },
    is() {
      return this;
    },
    order(_column: string, options?: { ascending?: boolean }) {
      const ascending = options?.ascending ?? false;
      if (!months.length) {
        return { data: [], error: null };
      }
      const month = ascending ? months[0] : months[months.length - 1];
      return { data: [{ month }], error: null };
    },
  };

  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }),
    },
    from() {
      return builder;
    },
  };
}

function createWindowSupabase(rows: Array<{ month: string }>) {
  const builder = {
    select() {
      return this;
    },
    limit() {
      return this;
    },
    in() {
      return this;
    },
    eq() {
      return this;
    },
    is() {
      return this;
    },
    order() {
      return { data: rows, error: null };
    },
  };

  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }),
    },
    from() {
      return builder;
    },
  };
}

function createHistorySupabase(rows: Array<{ month: string }>) {
  const builder = {
    select() {
      return this;
    },
    limit() {
      return this;
    },
    in() {
      return this;
    },
    eq() {
      return this;
    },
    is() {
      return this;
    },
    order() {
      return this;
    },
    then(
      resolve: (value: { data: Array<{ month: string }>; error: null }) => void,
    ) {
      return Promise.resolve(resolve({ data: rows, error: null }));
    },
  };

  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }),
    },
    from() {
      return builder;
    },
  };
}

function createCashflowSupabase(
  rows: Array<{
    household_id: string | null;
    month: string;
    income_cents: number;
    expense_cents: number;
    net_cents: number;
  }>,
) {
  const tracker = {
    fromCalls: [] as string[],
    eqCalls: [] as Array<{ column: string; value: string }>,
    isCalls: [] as Array<{ column: string; value: null }>,
  };

  const builder = {
    selectedMonths: [] as string[],
    householdFilter: undefined as string | null | undefined,
    select() {
      return this;
    },
    in(column: string, value: string[]) {
      if (column === 'month') {
        this.selectedMonths = value;
      }
      return this;
    },
    eq(column: string, value: string) {
      if (column === 'household_id') {
        this.householdFilter = value;
        tracker.eqCalls.push({ column, value });
      }
      return this;
    },
    is(column: string, value: null) {
      if (column === 'household_id') {
        this.householdFilter = value;
        tracker.isCalls.push({ column, value });
      }
      return this;
    },
    order() {
      const selected =
        this.selectedMonths.length > 0 ? new Set(this.selectedMonths) : null;
      const filtered = rows
        .filter(row => (selected ? selected.has(row.month) : true))
        .filter(row => {
          if (this.householdFilter === undefined) return true;
          if (this.householdFilter === null) return row.household_id === null;
          return row.household_id === this.householdFilter;
        })
        .sort((left, right) => left.month.localeCompare(right.month));

      return Promise.resolve({ data: filtered, error: null });
    },
  };

  return {
    tracker,
    supabase: {
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }),
      },
      from(table: string) {
        tracker.fromCalls.push(table);
        return builder;
      },
    },
  };
}

describe('expense-stats actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonthlyDataBounds', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns earliest month and current month for household scope', async () => {
      const months = buildMonthList('2021-01', 36);
      createSupabaseServerClient.mockResolvedValue(
        createBoundsSupabase(months),
      );

      const result = await getMonthlyDataBounds({
        scope: 'household',
        householdId: 'household-1',
      });

      expect(result.data.earliestMonth).toBe('2021-01');
      expect(result.data.currentMonth).toBe('2024-06');
      expect(result.errorCode).toBeUndefined();
    });

    it('returns null earliestMonth when no data exists', async () => {
      createSupabaseServerClient.mockResolvedValue(createBoundsSupabase([]));

      const result = await getMonthlyDataBounds({
        scope: 'household',
        householdId: 'household-1',
      });

      expect(result.data.earliestMonth).toBeNull();
      expect(result.data.currentMonth).toBe('2024-06');
    });
  });

  describe('getMonthlyWindow', () => {
    it('returns a 12-month window ending at the specified month', async () => {
      const rows = buildMonthlyByCategoryUserRows({
        startMonth: '2023-01',
        count: 12,
        householdId: 'household-1',
        userLabel: 'Ada Lovelace',
      });

      createSupabaseServerClient.mockResolvedValue(createWindowSupabase(rows));

      const result = await getMonthlyWindow({
        scope: 'household',
        householdId: 'household-1',
        endMonth: '2023-12',
      });

      expect(result.data.months).toHaveLength(12);
      expect(result.data.months[0]).toBe('2023-01');
      expect(result.data.months[11]).toBe('2023-12');
      expect(result.data.rows).toHaveLength(rows.length);
    });
  });

  describe('getMonthlyHistory', () => {
    it('extends months to current month even when latest row is in the past', async () => {
      const rows = buildMonthlyByCategoryUserRows({
        startMonth: '2022-11',
        count: 5,
        householdId: 'household-1',
        userLabel: 'Ada Lovelace',
      });

      createSupabaseServerClient.mockResolvedValue(createHistorySupabase(rows));

      const result = await getMonthlyHistory({
        scope: 'household',
        householdId: 'household-1',
      });

      const currentMonth = new Date().toISOString().slice(0, 7);
      expect(result.data.months[0]).toBe('2022-11');
      expect(result.data.months[result.data.months.length - 1]).toBe(
        currentMonth,
      );
      expect(result.data.rows).toHaveLength(rows.length);
    });
  });

  describe('cashflow datasets', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns monthly income-vs-expense data for personal scope with zero-filled months', async () => {
      const { supabase, tracker } = createCashflowSupabase([
        {
          household_id: null,
          month: '2024-04',
          income_cents: 150000,
          expense_cents: 90000,
          net_cents: 60000,
        },
        {
          household_id: null,
          month: '2024-06',
          income_cents: 120000,
          expense_cents: 100000,
          net_cents: 20000,
        },
        {
          household_id: 'household-1',
          month: '2024-05',
          income_cents: 999999,
          expense_cents: 111111,
          net_cents: 888888,
        },
      ]);

      createSupabaseServerClient.mockResolvedValue(supabase);

      const result = await getMonthlyIncomeVsExpenseData({
        scope: 'personal',
      });

      expect(tracker.fromCalls).toContain('monthly_cashflow_net');
      expect(tracker.isCalls).toEqual([
        { column: 'household_id', value: null },
      ]);
      expect(result.errorCode).toBeUndefined();
      expect(result.data.months).toEqual([
        {
          month: '2024-04',
          incomeCents: 150000,
          expenseCents: 90000,
          netCents: 60000,
        },
        {
          month: '2024-05',
          incomeCents: 0,
          expenseCents: 0,
          netCents: 0,
        },
        {
          month: '2024-06',
          incomeCents: 120000,
          expenseCents: 100000,
          netCents: 20000,
        },
      ]);
    });

    it('returns cumulative savings data for household scope with running net sums', async () => {
      const { supabase, tracker } = createCashflowSupabase([
        {
          household_id: 'household-1',
          month: '2024-04',
          income_cents: 200000,
          expense_cents: 120000,
          net_cents: 80000,
        },
        {
          household_id: 'household-1',
          month: '2024-05',
          income_cents: 180000,
          expense_cents: 210000,
          net_cents: -30000,
        },
        {
          household_id: 'household-1',
          month: '2024-06',
          income_cents: 260000,
          expense_cents: 160000,
          net_cents: 100000,
        },
        {
          household_id: 'household-2',
          month: '2024-06',
          income_cents: 999999,
          expense_cents: 1,
          net_cents: 999998,
        },
      ]);

      createSupabaseServerClient.mockResolvedValue(supabase);

      const result = await getCumulativeSavingsData({
        scope: 'household',
        householdId: 'household-1',
      });

      expect(tracker.eqCalls).toEqual([
        { column: 'household_id', value: 'household-1' },
      ]);
      expect(result.errorCode).toBeUndefined();
      expect(result.data.months).toEqual([
        {
          month: '2024-04',
          netCents: 80000,
          cumulativeCents: 80000,
        },
        {
          month: '2024-05',
          netCents: -30000,
          cumulativeCents: 50000,
        },
        {
          month: '2024-06',
          netCents: 100000,
          cumulativeCents: 150000,
        },
      ]);
    });
  });
});
