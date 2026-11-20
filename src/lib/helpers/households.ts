import { createSupabaseServerClient } from '@lib-supabase/server';
import type { HouseholdError } from '@lib-types/errors';
import type {
  Household,
  HouseholdMemberProfile,
  HouseholdMembership,
  JoinHouseholdResult,
} from '@lib-types/households';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchHouseholdMembership(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to load household membership', error);
    return null;
  }

  return data as HouseholdMembership | null;
}

export async function getHouseholdMembershipForUser(userId: string) {
  const supabase = await createSupabaseServerClient();
  return fetchHouseholdMembership(supabase, userId);
}

export async function fetchHouseholdById(
  supabase: SupabaseClient,
  householdId: string,
) {
  const { data, error } = await supabase
    .from('households')
    .select('id, name, owner')
    .eq('id', householdId)
    .single();

  if (error) {
    console.error('Failed to load household', error);
    return null;
  }

  return data as Household | null;
}

export async function fetchHouseholdForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Household | null> {
  const membership = await fetchHouseholdMembership(supabase, userId);
  if (!membership) {
    return null;
  }
  return fetchHouseholdById(supabase, membership.household_id);
}

export async function getHouseholdForUser(userId: string) {
  const supabase = await createSupabaseServerClient();
  return fetchHouseholdForUser(supabase, userId);
}

export async function fetchHouseholdMembers(
  supabase: SupabaseClient,
  householdId: string,
): Promise<HouseholdMemberProfile[]> {
  const { data, error } = await supabase.rpc('get_household_member_profiles', {
    p_household_id: householdId,
  });

  if (error) {
    console.error('Failed to load household members', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map((row: HouseholdMemberProfile) => ({
    role: row.role ?? '',
    display_name: row.display_name ?? null,
    email: row.email ?? null,
    user_id: row.user_id ?? undefined,
    color_slot: row.color_slot ?? null,
  }));
}

const JOIN_ERROR_CODES: Record<string, HouseholdError> = {
  household_full: 'household_full',
  user_has_a_household: 'user_has_a_household',
  invite_invalid: 'household_invalid',
};

/**
 * Joins the caller to the household of the user who owns `inviteToken`.
 * The database checks the token, the member limit and the one-household rule.
 */
export async function joinHouseholdWithInvite(
  supabase: SupabaseClient,
  inviteToken: string,
): Promise<JoinHouseholdResult> {
  const { error } = await supabase.rpc('join_household_with_invite', {
    p_token: inviteToken,
  });

  // A unique violation means a concurrent request already added this user.
  if (!error || error.code === '23505') {
    return { joined: true };
  }

  return {
    joined: false,
    errorCode:
      JOIN_ERROR_CODES[error.message] ?? 'household_membership_create_failed',
  };
}
