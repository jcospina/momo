import {
  setCurrency as setCurrencyAction,
  setLanguage as setLanguageAction,
  setOnboardingStatus as setOnboardingStatusAction,
} from '@actions/user-prefs';
import { getUserPreferences as getUserPreferencesHelper } from '@helpers/user-prefs';

import {
  getUserPreferences,
  setCurrency,
  setLanguage,
  setOnboardingStatus,
} from './server';

jest.mock('@actions/user-prefs', () => ({
  setOnboardingStatus: jest.fn(),
  setCurrency: jest.fn(),
  setLanguage: jest.fn(),
}));

jest.mock('@helpers/user-prefs', () => ({
  getUserPreferences: jest.fn(),
}));

describe('data/prefs/server facade', () => {
  const setOnboardingStatusMock = jest.mocked(setOnboardingStatusAction);
  const setCurrencyMock = jest.mocked(setCurrencyAction);
  const setLanguageMock = jest.mocked(setLanguageAction);
  const getUserPreferencesMock = jest.mocked(getUserPreferencesHelper);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates preference reads to helper', async () => {
    const prefs = { onboarding_status: 'completed', currency: 'USD' };
    getUserPreferencesMock.mockResolvedValue(
      prefs as Awaited<ReturnType<typeof getUserPreferencesHelper>>,
    );

    const result = await getUserPreferences('user-1');

    expect(getUserPreferencesMock).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(prefs);
  });

  it('delegates onboarding status updates', async () => {
    setOnboardingStatusMock.mockResolvedValue(undefined);

    await setOnboardingStatus('completed');

    expect(setOnboardingStatusMock).toHaveBeenCalledWith('completed');
  });

  it('delegates currency updates', async () => {
    setCurrencyMock.mockResolvedValue({});

    await setCurrency('USD');

    expect(setCurrencyMock).toHaveBeenCalledWith('USD');
  });

  it('delegates language updates', async () => {
    setLanguageMock.mockResolvedValue({});

    await setLanguage('es');

    expect(setLanguageMock).toHaveBeenCalledWith('es');
  });
});
