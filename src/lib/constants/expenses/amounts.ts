import type { SupportedCurrency } from '@lib-types/user-preferences';

export const AMOUNT_REGEX = /([0-9]+(?:\.[0-9]+)?)([kKmM])?/;

export const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
};

export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';
