import type {
  CurrencyMetadata,
  SupportedCurrency,
} from '@lib-types/user-preferences';

export const CURRENCIES: Record<SupportedCurrency, CurrencyMetadata> = {
  EUR: { symbol: '€', name: 'Euro' },
  COP: { symbol: '$', name: 'Colombian Peso' },
  USD: { symbol: '$', name: 'United States Dollar' },
};
