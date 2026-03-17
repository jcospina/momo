import { loginWithProvider as loginWithProviderAction } from '@actions/login';
import { logout as logoutAction } from '@actions/logout';

import type { AuthProvider, LoginWithProvider, Logout } from './types';

export const loginWithProvider: LoginWithProvider = async (
  provider: AuthProvider,
): Promise<void> => loginWithProviderAction(provider);

export const logout: Logout = async (): Promise<void> => logoutAction();
