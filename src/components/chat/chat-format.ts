import type { SupportedCurrency } from '@lib-types/user-preferences';
import { formatCurrencyAmount } from '@utils/currency';
import { format, getYear, isToday, isYesterday, type Locale } from 'date-fns';
import { enUS, es } from 'date-fns/locale';

export function dateLocale(locale: string): Locale {
  return locale.startsWith('es') ? es : enUS;
}

/** "8:34 PM" / "20:34", following the app language. */
export function formatTime(iso: string, locale: string): string {
  return format(new Date(iso), 'p', { locale: dateLocale(locale) });
}

export function dayKey(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd');
}

export function isSameDay(first: string, second: string): boolean {
  return dayKey(first) === dayKey(second);
}

/** "Today", "Yesterday", "Tue, Nov 18" (+ year when it isn't this year). */
export function formatDayLabel(
  iso: string,
  locale: string,
  words: { today: string; yesterday: string },
): string {
  const date = new Date(iso);
  if (isToday(date)) return words.today;
  if (isYesterday(date)) return words.yesterday;
  const pattern =
    getYear(date) === getYear(new Date()) ? 'EEE, MMM d' : 'EEE, MMM d, yyyy';
  return format(date, pattern, { locale: dateLocale(locale) });
}

/** "$12.50", or "$12.50 + €4.00" when a day mixes currencies. */
export function formatTotals(totals: Map<SupportedCurrency, number>): string {
  return [...totals.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([currency, amount]) => formatCurrencyAmount(amount, currency))
    .join(' + ');
}
