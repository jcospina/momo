import type { User } from '@supabase/supabase-js';

import { loginWithProvider as loginWithProviderAction } from '@actions/login';
import { logout as logoutAction } from '@actions/logout';
import { getCurrentUser as getCurrentUserHelper } from '@helpers/user';

import { getCurrentUser, loginWithProvider, logout } from './server';

jest.mock('@actions/login', () => ({
  loginWithProvider: jest.fn(),
}));

jest.mock('@actions/logout', () => ({
  logout: jest.fn(),
}));

jest.mock('@helpers/user', () => ({
  getCurrentUser: jest.fn(),
}));

describe('data/auth/server facade', () => {
  const loginWithProviderMock = jest.mocked(loginWithProviderAction);
  const logoutMock = jest.mocked(logoutAction);
  const getCurrentUserMock = jest.mocked(getCurrentUserHelper);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates provider login to the server action', async () => {
    loginWithProviderMock.mockResolvedValue(undefined);

    await loginWithProvider('google');

    expect(loginWithProviderMock).toHaveBeenCalledWith('google');
  });

  it('delegates logout to the server action', async () => {
    logoutMock.mockResolvedValue(undefined);

    await logout();

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('delegates current user reads to helper', async () => {
    const user = { id: 'user-1' } as User;
    getCurrentUserMock.mockResolvedValue(user);

    const result = await getCurrentUser();

    expect(getCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(user);
  });
});
