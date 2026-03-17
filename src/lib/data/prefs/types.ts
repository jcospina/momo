import type { MomoError } from '@lib-types/errors';
import type {
  OnboardingStatus,
  SupportedCurrency,
  SupportedLanguage,
  UserPreferences,
} from '@lib-types/user-preferences';

export type UpdatePrefResult = {
  errorCode?: MomoError;
};

export type GetUserPreferences = (
  userId: string,
) => Promise<UserPreferences | null>;
export type SetOnboardingStatus = (status: OnboardingStatus) => Promise<void>;
export type SetCurrency = (
  currency: SupportedCurrency,
) => Promise<UpdatePrefResult | void>;
export type SetLanguage = (
  language: SupportedLanguage,
) => Promise<UpdatePrefResult | void>;
export type SetAiEnabled = (next: boolean) => Promise<UpdatePrefResult | void>;
