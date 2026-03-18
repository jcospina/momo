import { buildMonthList } from '@/mocks/expense-stats-samples';
import {
  fetchAllMonthlyByCategoryUser,
  fetchMonthlyBoundsByCategoryUser,
} from './expense-stats';
import {
  buildCategoryUserWindowData,
  buildMonthlyCategoryTotals,
  formatCategoryLabel,
  toFirstName,
} from './expense-stats.aggregations';

function createBoundsSupabase(months: string[]) {
  const builder = {
    select() {
      return this;
    },
    limit() {
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
    from() {
      return builder;
    },
  };
}

function createAllSupabase(rows: Array<{ month: string }>) {
  const query = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    then: (
      resolve: (value: { data: Array<{ month: string }>; error: null }) => void,
    ) =>
      Promise.resolve(
        resolve({
          data: rows,
          error: null,
        }),
      ),
  };

  return {
    from: jest.fn(() => query),
    query,
  };
}

describe('expense-stats helpers', () => {
  describe('fetchMonthlyBoundsByCategoryUser', () => {
    it('returns earliest and latest months for multi-year data', async () => {
      const months = buildMonthList('2021-01', 36);
      const supabase = createBoundsSupabase(months);

      const result = await fetchMonthlyBoundsByCategoryUser({
        supabase: supabase as never,
        householdId: 'household-1',
      });

      expect(result.earliestMonth).toBe('2021-01');
      expect(result.latestMonth).toBe('2023-12');
    });

    it('returns nulls when no data exists', async () => {
      const supabase = createBoundsSupabase([]);

      const result = await fetchMonthlyBoundsByCategoryUser({
        supabase: supabase as never,
        householdId: null,
      });

      expect(result.earliestMonth).toBeNull();
      expect(result.latestMonth).toBeNull();
    });
  });

  describe('fetchAllMonthlyByCategoryUser', () => {
    it('returns rows ordered by month', async () => {
      const { from, query } = createAllSupabase([
        { month: '2024-02' },
        { month: '2024-01' },
      ]);

      const result = await fetchAllMonthlyByCategoryUser({
        supabase: { from } as unknown as Parameters<
          typeof fetchAllMonthlyByCategoryUser
        >[0]['supabase'],
        householdId: null,
      });

      expect(result).toEqual([{ month: '2024-02' }, { month: '2024-01' }]);
      expect(query.order).toHaveBeenCalledWith('month', { ascending: true });
      expect(query.is).toHaveBeenCalledWith('household_id', null);
    });
  });

  describe('expense-stats.aggregations', () => {
    it('builds monthly category totals for requested months', () => {
      const rows = [
        {
          household_id: 'household-1',
          month: '2024-01',
          category: 'rent',
          user_label: 'Ada Lovelace',
          total_cents: 100,
        },
        {
          household_id: 'household-1',
          month: '2024-01',
          category: 'rent',
          user_label: 'Ada Lovelace',
          total_cents: 200,
        },
      ];

      const result = buildMonthlyCategoryTotals(rows, ['2024-01', '2024-02']);
      expect(result).toHaveLength(2);
      expect(result[0].categories).toEqual([
        { category: 'rent', totalCents: 300 },
      ]);
      expect(result[1].categories).toEqual([]);
    });

    it('builds window data with formatted tooltips', () => {
      const rows = [
        {
          household_id: 'household-1',
          month: '2024-01',
          category: 'food_delivery',
          user_label: 'Ada Lovelace',
          total_cents: 100,
        },
        {
          household_id: 'household-1',
          month: '2024-01',
          category: 'food_delivery',
          user_label: 'bob@example.com',
          total_cents: 200,
        },
      ];

      const result = buildCategoryUserWindowData(rows, ['2024-01']);
      expect(result.categoryItems).toEqual([
        { category: 'food_delivery', totalCents: 300 },
      ]);
      expect(result.categoryTooltip['Food Delivery']).toEqual([
        { label: 'bob', totalCents: 200 },
        { label: 'Ada', totalCents: 100 },
      ]);
      expect(result.userTooltip['Ada']).toEqual([
        { category: 'Food Delivery', totalCents: 100 },
      ]);
    });

    it('formats category labels and first names', () => {
      expect(formatCategoryLabel('food_delivery')).toBe('Food Delivery');
      expect(toFirstName('bob@example.com')).toBe('bob');
    });
  });
});
