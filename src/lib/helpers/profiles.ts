import type { Profile } from '@lib-types/profile';
import { createSupabaseServerClient } from '@lib-supabase/server';
import type { AuthUser, PostgrestError, User } from '@supabase/supabase-js';
function getDisplayName(user: User) {
  const nameFromMetadata = user.user_metadata?.name;
  if (typeof nameFromMetadata === 'string' && nameFromMetadata.trim()) {
    return nameFromMetadata.trim();
  }
  if (user.email) {
    const [local] = user.email.split('@');
    return local;
  }
  return null;
}

/**
 * Ensure the caller has a profile row. If it exists, leave it untouched.
 */
export async function createUserProfile(
  user: AuthUser,
): Promise<PostgrestError | null> {
  const supabase = await createSupabaseServerClient();
  const displayName = getDisplayName(user);

  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: user.id,
      display_name: displayName,
      email: user.email,
    },
    {
      ignoreDuplicates: true,
    },
  );
  return error;
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, email, invite_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && !data) {
    console.error('fetchUserProfile failed', error);
    return null;
  }

  return data as Profile;
}
