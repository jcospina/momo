'use server';

import { OnboardingStatus } from '@lib-types/user-preferences';
import { createSupabaseServerClient } from '@supabase/server';
import { redirect } from 'next/navigation';

export async function setOnboardingStatus(
  status: OnboardingStatus,
): Promise<void> {
  console.log('setOnboardingStatus called with', status);
  if (status !== 'skipped' && status !== 'completed') {
    throw new Error('Invalid onboarding status');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { error } = await supabase
    .from('user_prefs')
    .upsert(
      { user_id: user.id, onboarding_status: status },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('setOnboardingStatus failed', error);
    throw new Error(error.message);
  }

  redirect('/home');
}
