import {
  loginAsDemo as loginAsDemoAction,
  loginWithPassword as loginWithPasswordAction,
  loginWithProvider as loginWithProviderAction,
  signupWithPassword as signupWithPasswordAction,
} from '@actions/login';
import { logout as logoutAction } from '@actions/logout';

import type {
  AuthProvider,
  LoginAsDemo,
  LoginWithPassword,
  LoginWithPasswordState,
  LoginWithProvider,
  Logout,
  SignupWithPassword,
  SignupWithPasswordState,
} from './types';

export const loginWithProvider: LoginWithProvider = async (
  provider: AuthProvider,
): Promise<void> => loginWithProviderAction(provider);

export const loginWithPassword: LoginWithPassword = async (
  prevState: LoginWithPasswordState,
  formData: FormData,
): Promise<LoginWithPasswordState> =>
  loginWithPasswordAction(prevState, formData);

export const signupWithPassword: SignupWithPassword = async (
  prevState: SignupWithPasswordState,
  formData: FormData,
): Promise<SignupWithPasswordState> =>
  signupWithPasswordAction(prevState, formData);

export const loginAsDemo: LoginAsDemo = async (): Promise<void> =>
  loginAsDemoAction();

export const logout: Logout = async (): Promise<void> => logoutAction();
