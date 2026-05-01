export type ParsedMonth = {
  year: number;
  monthIndex: number;
};

export function parseMonthKey(month: string): ParsedMonth | null {
  const [yearPart, monthPart] = month.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return null;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

export function formatMonthKey(year: number, monthIndex: number) {
  const month = String(monthIndex + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function toDisplayAmount(amountCents: number, currency: string) {
  const divisor = currency === 'COP' ? 1 : 100;
  return amountCents / divisor;
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number, currency: string) {
  const abs = Math.abs(amount);
  let suffix = '';
  let scaled = amount;

  if (abs >= 1_000_000_000) {
    scaled = amount / 1_000_000_000;
    suffix = 'B';
  } else if (abs >= 1_000_000) {
    scaled = amount / 1_000_000;
    suffix = 'M';
  } else if (abs >= 1_000) {
    scaled = amount / 1_000;
    suffix = 'K';
  }

  const maximumFractionDigits = abs >= 1_000 ? 1 : currency === 'COP' ? 0 : 2;
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(scaled);

  return `${formatted}${suffix}`;
}

export type YAxisBounds = {
  min: number;
  max: number;
};

export function buildYAxisBounds(values: number[]): YAxisBounds {
  if (!values.length) {
    return { min: -1, max: 1 };
  }

  const baseMin = Math.min(0, ...values);
  const baseMax = Math.max(0, ...values);

  if (baseMin === baseMax) {
    const padding = Math.max(Math.abs(baseMin) * 0.1, 1);
    return {
      min: baseMin - padding,
      max: baseMax + padding,
    };
  }

  const padding = Math.max((baseMax - baseMin) * 0.05, 1);
  return {
    min: baseMin - padding,
    max: baseMax + padding,
  };
}

/**
 * Forward-fill a sparse day -> value map into a dense array of length `maxDay`.
 * Days with no value inherit the previous known value (initialized to 0).
 * Used by the daily-comparison line chart to keep the visual trend continuous
 * across days where no expenses landed.
 */
export function forwardFillDays(
  points: Array<{ day: number; totalCents: number }>,
  maxDay: number,
) {
  const map = new Map<number, number>();
  points.forEach(point => {
    if (point.day < 1 || point.day > maxDay) return;
    map.set(point.day, point.totalCents);
  });

  const values: number[] = [];
  let last = 0;
  for (let day = 1; day <= maxDay; day += 1) {
    const value = map.get(day);
    if (value === undefined) {
      values.push(last);
    } else {
      last = value;
      values.push(value);
    }
  }
  return values;
}

export type LabelMode = 'short' | 'narrow';

export function pickLabelMode(
  containerWidth: number,
  labelCount: number,
  threshold = 40,
): LabelMode {
  if (!labelCount || !containerWidth) return 'short';
  return containerWidth / labelCount < threshold ? 'narrow' : 'short';
}

export function makeMonthFormatter(mode: LabelMode) {
  return new Intl.DateTimeFormat(undefined, { month: mode });
}

export function makeMonthYearFormatter() {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  });
}
