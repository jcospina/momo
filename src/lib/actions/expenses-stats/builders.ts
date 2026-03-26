import type {
  CumulativeSavingsPoint,
  DailyPoint,
  MonthlyCashflowPoint,
  MonthlyCategoryTotals,
} from './types';

export function normalizeCategory(category: string | null): string {
  const trimmed = category?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'uncategorized';
}

export function toCents(value: number | string | null | undefined): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function buildMonthlyCategoryTotals(
  months: string[],
  rows: Array<{ month: string; category: string | null; total_cents: number }>,
): MonthlyCategoryTotals[] {
  const monthMap = new Map<string, Map<string, number>>();

  rows.forEach(row => {
    const monthEntry = monthMap.get(row.month) ?? new Map<string, number>();
    const category = normalizeCategory(row.category);
    monthEntry.set(
      category,
      (monthEntry.get(category) ?? 0) + (row.total_cents ?? 0),
    );
    monthMap.set(row.month, monthEntry);
  });

  return months.map(month => {
    const categories = Array.from(monthMap.get(month)?.entries() ?? []).map(
      ([category, totalCents]) => ({
        category,
        totalCents,
      }),
    );
    return { month, categories };
  });
}

export function buildDailyPoints(
  rows: Array<{
    day: number;
    total_cents: number;
    cumulative_cents: number | null;
  }>,
): DailyPoint[] {
  return [...rows]
    .sort((left, right) => left.day - right.day)
    .map(row => ({
      day: row.day,
      totalCents: row.cumulative_cents ?? row.total_cents ?? 0,
    }));
}

export function buildMonthlyCashflowPoints(
  months: string[],
  rows: Array<{
    month: string;
    income_cents: number;
    expense_cents: number;
    net_cents: number;
  }>,
): MonthlyCashflowPoint[] {
  const monthMap = new Map<string, MonthlyCashflowPoint>();

  rows.forEach(row => {
    const existing = monthMap.get(row.month) ?? {
      month: row.month,
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
    };

    existing.incomeCents += toCents(row.income_cents);
    existing.expenseCents += toCents(row.expense_cents);
    existing.netCents += toCents(row.net_cents);
    monthMap.set(row.month, existing);
  });

  return months.map(month => {
    const monthData = monthMap.get(month);
    if (monthData) {
      return monthData;
    }

    return {
      month,
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
    };
  });
}

export function buildCumulativeSavingsPoints(
  monthlyPoints: MonthlyCashflowPoint[],
): CumulativeSavingsPoint[] {
  let runningTotal = 0;

  return monthlyPoints.map(point => {
    runningTotal += point.netCents;
    return {
      month: point.month,
      netCents: point.netCents,
      cumulativeCents: runningTotal,
    };
  });
}
