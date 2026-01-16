import type { MonthlyByCategoryUserRow } from '@lib-types/expense-stats';

export function formatMonthLabel(month: string) {
  const parsed = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return month;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function formatMonthRange(months: string[]) {
  if (!months.length) return '';
  const first = formatMonthLabel(months[0]);
  const last = formatMonthLabel(months[months.length - 1]);
  return first === last ? first : `${first}–${last}`;
}

export function buildMonthlyWindows<T>(items: T[], windowSize: number): T[][] {
  const size = Math.max(1, Math.floor(windowSize));
  if (items.length === 0) return [];
  if (items.length <= size) return [items];

  const windows: T[][] = [];
  let index = 0;
  while (index + size <= items.length) {
    windows.push(items.slice(index, index + size));
    index += size;
  }

  if (index < items.length) {
    windows.push(items.slice(index));
  }

  return windows;
}

type MonthlyWindowPayload = {
  months: string[];
  rows: MonthlyByCategoryUserRow[];
};

export type MonthlyWindow = MonthlyWindowPayload & {
  endMonth: string;
};

export type MonthlyWindowFetcher = (
  endMonth: string,
) => Promise<MonthlyWindowPayload>;

export function createMonthlyWindowCache(fetchWindow: MonthlyWindowFetcher) {
  const cache = new Map<string, MonthlyWindow>();

  return {
    hasWindow(endMonth: string) {
      return cache.has(endMonth);
    },
    size() {
      return cache.size;
    },
    clear() {
      cache.clear();
    },
    async getWindow(endMonth: string) {
      const cached = cache.get(endMonth);
      if (cached) return cached;
      const payload = await fetchWindow(endMonth);
      const window: MonthlyWindow = { endMonth, ...payload };
      cache.set(endMonth, window);
      return window;
    },
  };
}
