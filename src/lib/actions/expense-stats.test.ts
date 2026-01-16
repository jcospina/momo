import {
  buildMonthList,
  buildMonthlyByCategoryUserRows,
} from '../../mocks/expense-stats-samples';
import {
  getMonthlyDataBounds,
  getMonthlyHistory,
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

describe('expense-stats actions', () => {
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
    it('returns all months between earliest and latest rows', async () => {
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

      expect(result.data.months).toEqual([
        '2022-11',
        '2022-12',
        '2023-01',
        '2023-02',
        '2023-03',
      ]);
      expect(result.data.rows).toHaveLength(rows.length);
    });
  });
});
