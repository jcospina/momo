import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AgentAuthContext } from '@/agent/context';

export function createAgentSupabaseClient(
  auth: AgentAuthContext,
): SupabaseClient {
  return createClient(auth.supabaseUrl, auth.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
      },
    },
  });
}
