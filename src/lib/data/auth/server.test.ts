import {
  loginAsDemo as loginAsDemoAction,
  loginWithPassword as loginWithPasswordAction,
  loginWithProvider as loginWithProviderAction,
  signupWithPassword as signupWithPasswordAction,
} from '@actions/login';
import { logout as logoutAction } from '@actions/logout';
import { getCurrentUser as getCurrentUserHelper } from '@helpers/user';
import type { User } from '@supabase/supabase-js';

import {
  getCurrentUser,
  loginAsDemo,
  loginWithPassword,
  loginWithProvider,
  logout,
  signupWithPassword,
} from './server';

jest.mock('@actions/login', () => ({
  loginWithProvider: jest.fn(),
  loginWithPassword: jest.fn(),
  signupWithPassword: jest.fn(),
  loginAsDemo: jest.fn(),
}));

jest.mock('@actions/logout', () => ({
  logout: jest.fn(),
}));

jest.mock('@helpers/user', () => ({
  getCurrentUser: jest.fn(),
}));

describe('data/auth/server facade', () => {
  const loginWithProviderMock = jest.mocked(loginWithProviderAction);
  const loginWithPasswordMock = jest.mocked(loginWithPasswordAction);
  const signupWithPasswordMock = jest.mocked(signupWithPasswordAction);
  const loginAsDemoMock = jest.mocked(loginAsDemoAction);
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

  it('delegates password login to the server action', async () => {
    loginWithPasswordMock.mockResolvedValue({});
    const formData = new FormData();

    await loginWithPassword({}, formData);

    expect(loginWithPasswordMock).toHaveBeenCalledWith({}, formData);
  });

  it('delegates password signup to the server action', async () => {
    signupWithPasswordMock.mockResolvedValue({});
    const formData = new FormData();

    await signupWithPassword({}, formData);

    expect(signupWithPasswordMock).toHaveBeenCalledWith({}, formData);
  });

  it('delegates demo login to the server action', async () => {
    loginAsDemoMock.mockResolvedValue(undefined);

    await loginAsDemo();

    expect(loginAsDemoMock).toHaveBeenCalledTimes(1);
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
