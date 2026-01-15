import type { MonthlyByCategoryUserRow } from '@lib-types/expense-stats';
import {
  buildMonthList,
  buildMonthlyByCategoryUserRows,
} from '../../../mocks/expense-stats-samples';
import {
  buildMonthlyWindows,
  createMonthlyWindowCache,
  formatMonthLabel,
  formatMonthRange,
} from './expense-stats.months';

describe('expense-stats months helpers', () => {
  describe('month formatting', () => {
    it('formats a month label', () => {
      const result = formatMonthLabel('2024-01');
      expect(result).toMatch(/Jan/);
    });

    it('formats a month range', () => {
      const result = formatMonthRange(['2024-01', '2024-03']);
      expect(result).toContain('Jan');
      expect(result).toContain('Mar');
    });

    it('returns empty string for no months', () => {
      expect(formatMonthRange([])).toBe('');
    });
  });

  describe('buildMonthlyWindows', () => {
    it('returns a single window when items length is within the range', () => {
      const months = ['2025-10', '2025-11', '2025-12'];
      expect(buildMonthlyWindows(months, 6)).toEqual([months]);
    });

    it('chunks windows by the selected range size starting from the start', () => {
      const months = [
        '2025-02',
        '2025-03',
        '2025-04',
        '2025-05',
        '2025-06',
        '2025-07',
        '2025-08',
        '2025-09',
        '2025-10',
        '2025-11',
        '2025-12',
        '2026-01',
      ];

      expect(buildMonthlyWindows(months, 6)).toEqual([
        ['2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07'],
        ['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01'],
      ]);
    });

    it('keeps a shorter window when the last segment is incomplete', () => {
      const months = [
        '2024-12',
        '2025-01',
        '2025-02',
        '2025-03',
        '2025-04',
        '2025-05',
        '2025-06',
        '2025-07',
        '2025-08',
        '2025-09',
        '2025-10',
        '2025-11',
        '2025-12',
        '2026-01',
      ];

      expect(buildMonthlyWindows(months, 6)).toEqual([
        ['2024-12', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05'],
        ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'],
        ['2025-12', '2026-01'],
      ]);
    });

    it('places the partial window at the end', () => {
      const months = [
        '2025-01',
        '2025-02',
        '2025-03',
        '2025-04',
        '2025-05',
        '2025-06',
        '2025-07',
        '2025-08',
        '2025-09',
      ];

      expect(buildMonthlyWindows(months, 4)).toEqual([
        ['2025-01', '2025-02', '2025-03', '2025-04'],
        ['2025-05', '2025-06', '2025-07', '2025-08'],
        ['2025-09'],
      ]);
    });
  });

  describe('createMonthlyWindowCache', () => {
    function toDate(month: string) {
      const [year, monthPart] = month.split('-').map(Number);
      return new Date(year, (monthPart ?? 1) - 1, 1);
    }

    function formatMonth(date: Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }

    function subtractMonths(month: string, count: number) {
      const date = toDate(month);
      date.setMonth(date.getMonth() - count);
      return formatMonth(date);
    }

    it('fetches and caches a window by endMonth', async () => {
      const fetcher = jest.fn(async (endMonth: string) => {
        const startMonth = subtractMonths(endMonth, 11);
        const rows = buildMonthlyByCategoryUserRows({
          startMonth,
          count: 12,
          householdId: 'household-1',
          userLabel: 'Ada Lovelace',
        }) as MonthlyByCategoryUserRow[];

        return {
          months: buildMonthList(startMonth, 12),
          rows,
        };
      });

      const cache = createMonthlyWindowCache(fetcher);

      const first = await cache.getWindow('2023-12');
      const second = await cache.getWindow('2023-12');

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(first.months).toHaveLength(12);
      expect(second.months).toHaveLength(12);
      expect(cache.size()).toBe(1);
    });

    it('fetches a new window when navigating outside the cached range', async () => {
      const fetcher = jest.fn(async (endMonth: string) => {
        const startMonth = subtractMonths(endMonth, 11);
        const rows = buildMonthlyByCategoryUserRows({
          startMonth,
          count: 12,
          householdId: 'household-1',
          userLabel: 'Ada Lovelace',
        }) as MonthlyByCategoryUserRow[];

        return {
          months: buildMonthList(startMonth, 12),
          rows,
        };
      });

      const cache = createMonthlyWindowCache(fetcher);

      await cache.getWindow('2023-12');
      await cache.getWindow('2022-12');

      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(cache.size()).toBe(2);
    });

    it('reuses cached windows when navigating back', async () => {
      const fetcher = jest.fn(async (endMonth: string) => {
        const startMonth = subtractMonths(endMonth, 11);
        const rows = buildMonthlyByCategoryUserRows({
          startMonth,
          count: 12,
          householdId: 'household-1',
          userLabel: 'Ada Lovelace',
        }) as MonthlyByCategoryUserRow[];

        return {
          months: buildMonthList(startMonth, 12),
          rows,
        };
      });

      const cache = createMonthlyWindowCache(fetcher);

      await cache.getWindow('2023-12');
      await cache.getWindow('2022-12');
      await cache.getWindow('2023-12');

      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(cache.size()).toBe(2);
    });
  });
});
