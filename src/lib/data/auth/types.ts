import type { Provider, User } from '@supabase/supabase-js';

export type AuthProvider = Provider;
export type CurrentUser = User | null;

export type LoginWithProvider = (provider: AuthProvider) => Promise<void>;
export type Logout = () => Promise<void>;
export type GetCurrentUser = () => Promise<CurrentUser>;

export type LoginWithPasswordState = { error?: string };
export type LoginWithPassword = (
  prevState: LoginWithPasswordState,
  formData: FormData,
) => Promise<LoginWithPasswordState>;

export type SignupWithPasswordState = { error?: string };
export type SignupWithPassword = (
  prevState: SignupWithPasswordState,
  formData: FormData,
) => Promise<SignupWithPasswordState>;

export type LoginAsDemo = () => Promise<void>;
