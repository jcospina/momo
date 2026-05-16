import 'server-only';

import {
  loginAsDemo as loginAsDemoAction,
  loginWithPassword as loginWithPasswordAction,
  loginWithProvider as loginWithProviderAction,
  signupWithPassword as signupWithPasswordAction,
} from '@actions/login';
import { logout as logoutAction } from '@actions/logout';
import { getCurrentUser as getCurrentUserHelper } from '@helpers/user';

import type {
  AuthProvider,
  CurrentUser,
  GetCurrentUser,
  LoginAsDemo,
  LoginWithPassword,
  LoginWithPasswordState,
  LoginWithProvider,
  Logout,
  SignupWithPassword,
  SignupWithPasswordState,
} from './types';

export const getCurrentUser: GetCurrentUser = async (): Promise<CurrentUser> =>
  getCurrentUserHelper();

export const loginWithProvider: LoginWithProvider = async (
  provider: AuthProvider,
): Promise<void> => {
  'use server';

  return loginWithProviderAction(provider);
};

export const loginWithPassword: LoginWithPassword = async (
  prevState: LoginWithPasswordState,
  formData: FormData,
): Promise<LoginWithPasswordState> => {
  'use server';

  return loginWithPasswordAction(prevState, formData);
};

export const signupWithPassword: SignupWithPassword = async (
  prevState: SignupWithPasswordState,
  formData: FormData,
): Promise<SignupWithPasswordState> => {
  'use server';

  return signupWithPasswordAction(prevState, formData);
};

export const loginAsDemo: LoginAsDemo = async (): Promise<void> => {
  'use server';

  return loginAsDemoAction();
};

export const logout: Logout = async (): Promise<void> => {
  'use server';

  return logoutAction();
};
