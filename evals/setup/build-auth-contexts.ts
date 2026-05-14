import type {
  AuthContextsByCurrency,
  EvalFixtureTriple,
  EvalSeedIdentities,
} from '@evals/types/setup';
import { getLocalSupabaseEnv } from '@scripts/lib/supabase-env';
import { createClient } from '@supabase/supabase-js';
import type { AgentAuthContext } from '@/agent/context';
import { EVAL_FIXTURE_TRIPLES, getEvalPassword } from './eval-fixtures';

export type { AuthContextsByCurrency } from '@evals/types/setup';

/**
 * Signs each eval owner in via `signInWithPassword` and returns one
 * `AgentAuthContext` per currency.
 *
 * Signing in is mandatory: the spending-stats RPC is `SECURITY INVOKER` and
 * keys off `auth.uid()`, which is NULL under a raw service-role connection.
 * Each context is smoke-checked against the RPC to fail loud when seeding
 * didn't land or the JWT isn't being honored.
 */
export async function buildAuthContexts(
  identities: EvalSeedIdentities,
): Promise<AuthContextsByCurrency> {
  const { url, anonKey } = getLocalSupabaseEnv();
  const password = getEvalPassword();

  const contexts: AuthContextsByCurrency = new Map();

  for (const triple of EVAL_FIXTURE_TRIPLES) {
    const auth = await signInOwner({
      url,
      anonKey,
      triple,
      password,
    });
    contexts.set(triple.currency, auth);
    await runSmokeCheck(auth, triple);

    const expectedUserId = identities.get(triple.currency)?.ownerId;
    if (expectedUserId && expectedUserId !== auth.userId) {
      throw new Error(
        `Auth user ID mismatch for ${triple.currency}: signed-in ${auth.userId} vs seeded ${expectedUserId}`,
      );
    }
  }

  return contexts;
}

async function signInOwner({
  url,
  anonKey,
  triple,
  password,
}: {
  url: string;
  anonKey: string;
  triple: EvalFixtureTriple;
  password: string;
}): Promise<AgentAuthContext> {
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: triple.ownerEmail,
    password,
  });

  if (error || !data.session || !data.user) {
    throw new Error(
      `Failed to sign in ${triple.ownerEmail}: ${error?.message ?? 'no session returned'}`,
    );
  }

  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    supabaseUrl: url,
    supabaseAnonKey: anonKey,
  };
}

async function runSmokeCheck(
  auth: AgentAuthContext,
  triple: EvalFixtureTriple,
): Promise<void> {
  const supabase = createClient(auth.supabaseUrl, auth.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: `Bearer ${auth.accessToken}` } },
  });

  const { data, error } = await supabase.rpc('get_agent_spending_stats', {
    p_categories: null,
    p_currency: triple.currency,
    p_end_date: null,
    p_group_by: null,
    p_household_id: null,
    p_include_income: true,
    p_limit: null,
    p_merchants: null,
    p_scope: 'personal',
    p_start_date: null,
    p_tags: null,
  });

  if (error) {
    throw new Error(
      `Smoke check failed for ${triple.currency} (${triple.ownerEmail}): ${error.message}`,
    );
  }

  const transactionCount = Number(
    (data as { transactionCount?: number } | null)?.transactionCount ?? 0,
  );
  if (transactionCount <= 0) {
    throw new Error(
      `Smoke check for ${triple.currency} returned 0 rows. Likely auth.uid() is NULL or fixtures did not seed for ${triple.ownerEmail}.`,
    );
  }
}
