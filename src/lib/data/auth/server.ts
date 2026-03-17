import 'server-only';

import { loginWithProvider as loginWithProviderAction } from '@actions/login';
import { logout as logoutAction } from '@actions/logout';
import { getCurrentUser as getCurrentUserHelper } from '@helpers/user';

import type {
  AuthProvider,
  CurrentUser,
  GetCurrentUser,
  LoginWithProvider,
  Logout,
} from './types';

export const getCurrentUser: GetCurrentUser = async (): Promise<CurrentUser> =>
  getCurrentUserHelper();

export const loginWithProvider: LoginWithProvider = async (
  provider: AuthProvider,
): Promise<void> => {
  'use server';

  return loginWithProviderAction(provider);
};

export const logout: Logout = async (): Promise<void> => {
  'use server';

  return logoutAction();
};
