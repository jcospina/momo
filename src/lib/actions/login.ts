'use server';

import { createSupabaseServerClient } from '@lib-supabase/server';
import type { Provider } from '@supabase/supabase-js';
import { redirectWithError } from '@utils/redirect-with-error';
import { redirect } from 'next/navigation';

export async function loginWithProvider(provider: Provider) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error('Provider login failed', error);
    return redirectWithError('/login', 'auth_provider_failed');
  }

  if (!data.url) {
    redirectWithError('/login', 'auth_provider_failed');
  }
  redirect(data.url);
}
