import {
  setAiEnabled as setAiEnabledAction,
  setCurrency as setCurrencyAction,
  setLanguage as setLanguageAction,
  setOnboardingStatus as setOnboardingStatusAction,
} from '@actions/user-prefs';

import {
  setAiEnabled,
  setCurrency,
  setLanguage,
  setOnboardingStatus,
} from './client';

jest.mock('@actions/user-prefs', () => ({
  setOnboardingStatus: jest.fn(),
  setCurrency: jest.fn(),
  setLanguage: jest.fn(),
  setAiEnabled: jest.fn(),
}));

describe('data/prefs/client facade', () => {
  const setOnboardingStatusMock = jest.mocked(setOnboardingStatusAction);
  const setCurrencyMock = jest.mocked(setCurrencyAction);
  const setLanguageMock = jest.mocked(setLanguageAction);
  const setAiEnabledMock = jest.mocked(setAiEnabledAction);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates onboarding status updates', async () => {
    setOnboardingStatusMock.mockResolvedValue(undefined);

    await setOnboardingStatus('skipped');

    expect(setOnboardingStatusMock).toHaveBeenCalledWith('skipped');
  });

  it('delegates currency updates', async () => {
    setCurrencyMock.mockResolvedValue({});

    await setCurrency('COP');

    expect(setCurrencyMock).toHaveBeenCalledWith('COP');
  });

  it('delegates language updates', async () => {
    setLanguageMock.mockResolvedValue({});

    await setLanguage('en');

    expect(setLanguageMock).toHaveBeenCalledWith('en');
  });

  it('delegates AI toggle updates', async () => {
    setAiEnabledMock.mockResolvedValue({});

    await setAiEnabled(true);

    expect(setAiEnabledMock).toHaveBeenCalledWith(true);
  });
});
