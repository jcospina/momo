import { fetchHouseholdMembership } from '@helpers/households';
import { createSupabaseServerClient } from '@lib-supabase/server';
import type { MomoError } from '@lib-types/errors';
import type { ScopeInput } from './types';

type ResolveScopeInput = ScopeInput & {
  userId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
};

export type ScopedContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  householdId: string | null;
  scope: ScopeInput['scope'];
};

async function resolveScope({
  scope = 'auto',
  householdId,
  userId,
  supabase,
}: ResolveScopeInput): Promise<{
  householdId: string | null;
  errorCode?: MomoError;
}> {
  if (scope === 'personal') {
    return { householdId: null };
  }

  if (scope === 'household') {
    if (householdId) {
      return { householdId };
    }

    const membership = await fetchHouseholdMembership(supabase, userId);
    if (!membership) {
      return { householdId: null, errorCode: 'no_household' };
    }

    return { householdId: membership.household_id };
  }

  if (householdId) {
    return { householdId };
  }

  const membership = await fetchHouseholdMembership(supabase, userId);
  return { householdId: membership?.household_id ?? null };
}

export async function getScopedContext({
  scope,
  householdId,
}: ScopeInput): Promise<{
  context: ScopedContext | null;
  errorCode?: MomoError;
}> {
  const supabase = await createSupabaseServerClient();
  // Verified locally against the cached signing keys: no Auth server round
  // trip per stats query. Row access is still enforced by RLS on the token.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    return { context: null, errorCode: 'auth_required' };
  }

  const resolved = await resolveScope({
    scope,
    householdId,
    userId,
    supabase,
  });

  if (resolved.errorCode) {
    return { context: null, errorCode: resolved.errorCode };
  }

  return {
    context: {
      supabase,
      userId,
      householdId: resolved.householdId,
      scope,
    },
  };
}
