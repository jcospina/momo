'use server';

import { createSupabaseServerClient } from '@supabase/server';
import type { Provider } from '@supabase/supabase-js';
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
    throw new Error(error.message);
  }

  if (!data.url) {
    throw new Error('No URL returned from provider login');
  }
  redirect(data.url);
}
