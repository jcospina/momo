import { createSupabaseServerClient } from '@lib-supabase/server';
import { cache } from 'react';

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
});

/**
 * The signed-in user's id, read from the verified access token.
 *
 * getClaims checks the token's signature against the project's cached
 * signing keys, so unlike getUser it does not ask the Auth server on every
 * render. Pages only need the id; the proxy has already validated the
 * session for this request.
 */
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    return null;
  }

  return data.claims.sub;
});
