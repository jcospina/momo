import type { SupportedCurrency } from '@lib-types/user-preferences';

export type AgentAuthContext = {
  userId: string;
  accessToken: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export type AgentContext = {
  currency: SupportedCurrency;
  auth?: AgentAuthContext;
};
