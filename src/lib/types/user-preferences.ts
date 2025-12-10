export type OnboardingStatus = 'unknown' | 'skipped' | 'completed';

export const SUPPORTED_CURRENCIES = ['EUR', 'COP', 'USD'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS = ['€', '$'];

export type CurrencySymbol = (typeof CURRENCY_SYMBOLS)[number];
export interface CurrencyMetadata {
  symbol: CurrencySymbol;
  name: string;
}

export interface UserPreferences {
  onboarding_status: OnboardingStatus;
  currency?: SupportedCurrency;
  ai_enabled?: boolean;
}
