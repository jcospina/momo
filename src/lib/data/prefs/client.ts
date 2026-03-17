import {
  setAiEnabled as setAiEnabledAction,
  setCurrency as setCurrencyAction,
  setLanguage as setLanguageAction,
  setOnboardingStatus as setOnboardingStatusAction,
} from '@actions/user-prefs';
import type {
  OnboardingStatus,
  SupportedCurrency,
  SupportedLanguage,
} from '@lib-types/user-preferences';

import type {
  SetAiEnabled,
  SetCurrency,
  SetLanguage,
  SetOnboardingStatus,
  UpdatePrefResult,
} from './types';

export const setOnboardingStatus: SetOnboardingStatus = async (
  status: OnboardingStatus,
): Promise<void> => setOnboardingStatusAction(status);

export const setCurrency: SetCurrency = async (
  currency: SupportedCurrency,
): Promise<UpdatePrefResult | void> => setCurrencyAction(currency);

export const setLanguage: SetLanguage = async (
  language: SupportedLanguage,
): Promise<UpdatePrefResult | void> => setLanguageAction(language);

export const setAiEnabled: SetAiEnabled = async (
  next: boolean,
): Promise<UpdatePrefResult | void> => setAiEnabledAction(next);
