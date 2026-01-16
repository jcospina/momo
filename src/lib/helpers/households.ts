import { createSupabaseServerClient } from '@lib-supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  Household,
  HouseholdMemberProfile,
  HouseholdMembership,
} from '@lib-types/households';

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
  }));
}
