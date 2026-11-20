import type { SupportedCurrency } from '@lib-types/user-preferences';
import { CURRENCIES } from '@/lib/constants/currency';

const COP_LOCALE = 'es-CO';
const USD_LOCALE = 'en-US';
const EUR_LOCALE = 'de-DE';

export function isWholeUnitCurrency(currency: SupportedCurrency): boolean {
  return currency === 'COP';
}

export function isSupportedCurrency(code: unknown): code is SupportedCurrency {
  return typeof code === 'string' && code in CURRENCIES;
}

/** Stored expense rows carry a free-form code; anything unknown reads as USD. */
export function toSupportedCurrency(code: unknown): SupportedCurrency {
  return isSupportedCurrency(code) ? code : 'USD';
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

/**
 * Minor units → the decimal string `updateExpenses` expects as `amount`
 * (`1250` USD → `"12.5"`, `45000` COP → `"45000"`). Mirrors the expense
 * details dialog so both edit paths send identical payloads.
 */
export function toAmountInput(
  amountMinor: number,
  currency: SupportedCurrency,
): string {
  if (!Number.isFinite(amountMinor)) return '';
  return displayAmount(amountMinor, currency).toString();
}
