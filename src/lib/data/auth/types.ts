import type { Provider, User } from '@supabase/supabase-js';

export type AuthProvider = Provider;
export type CurrentUser = User | null;

export type LoginWithProvider = (provider: AuthProvider) => Promise<void>;
export type Logout = () => Promise<void>;
export type GetCurrentUser = () => Promise<CurrentUser>;
