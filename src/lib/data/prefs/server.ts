import 'server-only';

import {
  setCurrency as setCurrencyAction,
  setLanguage as setLanguageAction,
  setOnboardingStatus as setOnboardingStatusAction,
} from '@actions/user-prefs';
import { getUserPreferences as getUserPreferencesHelper } from '@helpers/user-prefs';
import type {
  OnboardingStatus,
  SupportedCurrency,
  SupportedLanguage,
  UserPreferences,
} from '@lib-types/user-preferences';

import type {
  GetUserPreferences,
  SetCurrency,
  SetLanguage,
  SetOnboardingStatus,
  UpdatePrefResult,
} from './types';

export const getUserPreferences: GetUserPreferences = async (
  userId: string,
): Promise<UserPreferences | null> => getUserPreferencesHelper(userId);

export const setOnboardingStatus: SetOnboardingStatus = async (
  status: OnboardingStatus,
): Promise<void> => {
  'use server';

  return setOnboardingStatusAction(status);
};

export const setCurrency: SetCurrency = async (
  currency: SupportedCurrency,
): Promise<UpdatePrefResult | void> => setCurrencyAction(currency);

export const setLanguage: SetLanguage = async (
  language: SupportedLanguage,
): Promise<UpdatePrefResult | void> => setLanguageAction(language);
