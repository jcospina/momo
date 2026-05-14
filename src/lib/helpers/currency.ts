import type { SupportedCurrency } from '@lib-types/user-preferences';
import { CURRENCIES } from '@/lib/constants/currency';

const COP_LOCALE = 'es-CO';
const USD_LOCALE = 'en-US';
const EUR_LOCALE = 'de-DE';

export function isWholeUnitCurrency(currency: SupportedCurrency): boolean {
  return currency === 'COP';
}

export function displayAmount(
  amountMinor: number,
  currency: SupportedCurrency,
): number {
  return isWholeUnitCurrency(currency) ? amountMinor : amountMinor / 100;
}

export function defaultLocaleFor(currency: SupportedCurrency): string {
  if (currency === 'COP') return COP_LOCALE;
  if (currency === 'EUR') return EUR_LOCALE;
  return USD_LOCALE;
}

export function formatCurrencyAmount(
  amountMinor: number,
  currency: SupportedCurrency,
  locale: string = defaultLocaleFor(currency),
): string {
  const fractionDigits = isWholeUnitCurrency(currency) ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(displayAmount(amountMinor, currency));
}

export function currencyMetadata(currency: SupportedCurrency) {
  return CURRENCIES[currency];
}
