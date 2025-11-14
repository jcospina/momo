import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@supabase/server';

import type { HouseholdMembership } from '@lib-types/households';

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
