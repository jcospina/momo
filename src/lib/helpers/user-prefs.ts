import type { UserPreferences } from '@lib-types/user-preferences';
import { createSupabaseServerClient } from '@supabase/server';

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_prefs')
    .select('onboarding_status, currency, ai_enabled')
    .eq('user_id', userId)
    .maybeSingle();
  if (error && !data) {
    console.error('Cannot fetch preferences');
    return null;
  }
  return data as UserPreferences;
}
