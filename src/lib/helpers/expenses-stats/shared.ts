export type ExpenseRollupRow = {
  expense_date: string;
  category: string | null;
  amount_cents: number | string | null;
};

export function toCents(value: number | string | null | undefined): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function toMonth(expenseDate: string): string | null {
  if (!expenseDate || expenseDate.length < 7) {
    return null;
  }

  const month = expenseDate.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(month) ? month : null;
}

export function toDay(expenseDate: string): number | null {
  const parts = expenseDate.split('-');
  if (parts.length !== 3) {
    return null;
  }

  const day = Number(parts[2]);
  return Number.isInteger(day) && day > 0 ? day : null;
}

export function normalizeCategory(category: string | null): string {
  const trimmed = category?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'uncategorized';
}

export function sortMonths(months: string[]): string[] {
  return [...months].sort((left, right) => left.localeCompare(right));
}

export function buildMonthDateBounds(months: string[]): {
  startDate: string;
  endDate: string;
} | null {
  if (!months.length) {
    return null;
  }

  const sorted = sortMonths(months);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return null;
  }

  const [yearString, monthString] = last.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const paddedDay = String(lastDay).padStart(2, '0');

  return {
    startDate: `${first}-01`,
    endDate: `${last}-${paddedDay}`,
  };
}
