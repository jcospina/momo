'use server';
import { createSupabaseServerClient } from '@lib-supabase/server';
import { redirectWithError } from '@utils/redirect-with-error';
import { redirect } from 'next/navigation';

export async function logout() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Logout failed', error);
    redirectWithError('/home/profile', 'logout_failed');
  }
  redirect('/');
}
