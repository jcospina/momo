import type { UserProfile } from '@lib-types/profile';
import { createSupabaseServerClient } from '@supabase/server';
import type { AuthUser, User } from '@supabase/supabase-js';
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
): Promise<UserProfile | null> {
  const supabase = await createSupabaseServerClient();
  const displayName = getDisplayName(user);

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: user.id,
        display_name: displayName,
        email: user.email,
      },
      {
        ignoreDuplicates: true,
      },
    )
    .select()
    .maybeSingle();

  if (error) {
    return null;
  }
  return data as UserProfile;
}

export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
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

  return data as UserProfile;
}
