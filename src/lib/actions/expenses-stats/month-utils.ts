import { format, isValid, parse, subMonths } from 'date-fns';
import type { MonthRangeInput } from './types';

export function normalizeMonth(month: string): string | null {
  const parsed = parse(month, 'yyyy-MM', new Date());
  if (!isValid(parsed)) {
    return null;
  }
  return format(parsed, 'yyyy-MM');
}

export function uniqueMonths(months: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  months.forEach(month => {
    if (!seen.has(month)) {
      seen.add(month);
      result.push(month);
    }
  });

  return result;
}

export function buildMonthRange({
  months,
  endMonth,
  count,
}: MonthRangeInput): string[] {
  if (months && months.length > 0) {
    const normalized = months
      .map(month => normalizeMonth(month))
      .filter((month): month is string => Boolean(month));

    return uniqueMonths(normalized);
  }

  const normalizedEnd =
    (endMonth && normalizeMonth(endMonth)) ?? format(new Date(), 'yyyy-MM');
  const parsedEnd = normalizeMonth(normalizedEnd);
  if (!parsedEnd) {
    return [];
  }

  const total = Math.max(1, Math.floor(count ?? 1));
  const endDate = parse(parsedEnd, 'yyyy-MM', new Date());
  if (!isValid(endDate)) {
    return [];
  }

  return Array.from({ length: total }, (_, index) => {
    const offset = total - 1 - index;
    return format(subMonths(endDate, offset), 'yyyy-MM');
  });
}

export function buildMonthSpan(start: string, end: string): string[] {
  const startDate = parse(start, 'yyyy-MM', new Date());
  const endDate = parse(end, 'yyyy-MM', new Date());
  if (!isValid(startDate) || !isValid(endDate) || startDate > endDate) {
    return [];
  }

  const months: string[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= endCursor) {
    months.push(format(cursor, 'yyyy-MM'));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}
