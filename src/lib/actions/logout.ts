'use server';
import { createSupabaseServerClient } from '@supabase/server';
import { redirect } from 'next/navigation';

export async function logout() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Logout failed', error);
    throw new Error(error.message);
  }
  redirect('/');
}
